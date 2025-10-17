from datetime import datetime, timedelta, timezone

class UtcRleDaylightChecker:
    """
    A highly compressed data structure for checking daylight status using 
    Run-Length Encoding (RLE), assuming all times are in UTC.

    ### New Algorithm: Indexed RLE (Run-Length Encoding)
    Instead of storing 96 bits (0s and 1s) for every 15-minute interval, this 
    structure stores only the two defining **interval indices** per day:
    1.  **Sunrise Interval Index:** The 0-95 index where daylight begins.
    2.  **Sunset Interval Index:** The 0-95 index where daylight ends.

    ### Efficiency:
    * **Space (Storage):** Greatly reduced. Each day requires only **14 bits** (7 bits for each of the two indices, as 7 bits can encode a value up to 127), 
        compared to 96 bits in the pure Bit Mask. This is a **~85% reduction**.
    * **Time (Query):** Remains **O(1)**. The query now performs an O(1) **14-bit 
        lookup** (bit shifting and masking) to retrieve the two indices, followed 
        by a simple integer comparison.
        
    ### Key Assumptions:
    1.  **Time Zone:** All input sun data and the query epoch timestamp must be in **UTC**.
    2.  **Resolution:** The check is accurate only to the nearest **15-minute interval**.
    3.  **Data Range:** Data is stored for a 365-day cycle.
    """

    # --- RLE Configuration ---
    INTERVAL_MINUTES = 15
    INTERVALS_PER_DAY = 96 # Max index is 95
    DAYS_IN_YEAR = 365
    BITS_PER_INDEX = 7     # 7 bits can encode 0-127, sufficient for 0-95
    BITS_PER_DAY = BITS_PER_INDEX * 2  # 14 bits/day
    INDEX_MASK = (1 << BITS_PER_INDEX) - 1 # Mask for 7 bits (127)
    
    def __init__(self, packed_data=0):
        self.packed_data = packed_data # A single integer holding all 365 RLE data points
        # Reference epoch for 2025-01-01 00:00:00 UTC
        self.REF_EPOCH_UTC = datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp()
        self.SECONDS_PER_DAY = 24 * 60 * 60
        self.SECONDS_PER_MINUTE = 60

    def _time_to_minutes(self, time_str):
        """Converts HH:MM time string to total minutes from midnight (0-1439)."""
        try:
            H, M = map(int, time_str.split(':'))
            return H * 60 + M
        except Exception:
            return None

    def create_rle_array(self, daily_sun_data):
        """
        Compiles daily UTC sunrise/sunset data into a single, compact, 
        bit-packed integer using 14 bits per day.

        The packing order is: (Sunset Index | Sunrise Index) for each day.
        The yearly data is packed such that Day 0 (Jan 1) is at the Most 
        Significant Bit (MSB) end, and Day 364 is at the Least Significant 
        Bit (LSB) end.

        :param daily_sun_data: List of dicts where 'sunrise' and 'sunset' are UTC times.
        :return: The single, bit-packed integer (the RLE Array).
        """
        data_map = {entry['date']: entry for entry in daily_sun_data}
        packed_data = 0
        
        start_date = datetime(2025, 1, 1) 
        
        # We iterate backward (364 down to 0) for packing simplicity, so Day 364 ends up 
        # at the LSB, making O(1) retrieval straightforward.
        
        # 1. Iterate through all 365 days
        for i in range(self.DAYS_IN_YEAR - 1, -1, -1):
            day = start_date + timedelta(days=i)
            date_key = day.strftime("%m-%d")
            
            entry = data_map.get(date_key)
            
            # 2. Determine Interval Indices (The RLE Data)
            if entry:
                sr_min = self._time_to_minutes(entry.get("sunrise"))
                ss_min = self._time_to_minutes(entry.get("sunset"))
                
                # Convert minutes to 0-based interval index (0-95)
                # Max value for an index is 96, but 7 bits is sufficient.
                sunrise_index = int(sr_min / self.INTERVAL_MINUTES) if sr_min is not None else 0
                sunset_index = int(ss_min / self.INTERVAL_MINUTES) if ss_min is not None else 0
            else:
                # Default to full night (0:00 to 0:00 next day)
                sunrise_index = 0
                sunset_index = 0
            
            # Error check to prevent indices > 95 from corrupting the bit field
            sunrise_index = min(sunrise_index, self.INTERVALS_PER_DAY)
            sunset_index = min(sunset_index, self.INTERVALS_PER_DAY)
                
            # 3. Pack the two 7-bit indices into a 14-bit segment
            day_segment = (sunset_index << self.BITS_PER_INDEX) | sunrise_index
            
            # 4. Append the 14-bit segment to the packed data
            # Shift existing data left by 14 bits
            packed_data <<= self.BITS_PER_DAY
            # Add the new segment to the LSB end
            packed_data |= day_segment
            
        self.packed_data = packed_data
        print(f"✅ RLE Array created. Total storage: {packed_data.bit_length()} bits ({packed_data.bit_length() / 8 / 1024:.2f} KB).")
        return packed_data

    def _get_day_rle_data(self, day_index):
        """
        Performs the core O(1) bit lookup to retrieve the 14-bit RLE data for a 
        given day index.
        
        :param day_index: The 0-based index of the day (0=Jan 1, 364=Dec 31).
        :return: Tuple (sunrise_index, sunset_index).
        """
        # Calculate distance from the LSB end (Day 364)
        days_from_end = self.DAYS_IN_YEAR - 1 - day_index
        
        # Total shift required to move the target 14-bit segment to the LSB
        shift_amount = days_from_end * self.BITS_PER_DAY
        
        # Shift the target segment to the LSB
        shifted_value = self.packed_data >> shift_amount
        
        # Mask: Extract the 14 bits of the RLE segment
        rle_segment = shifted_value & ((1 << self.BITS_PER_DAY) - 1)
        
        # Deconstruct the 14-bit segment into the two indices
        sunset_index = rle_segment >> self.BITS_PER_INDEX
        sunrise_index = rle_segment & self.INDEX_MASK
        
        return sunrise_index, sunset_index

    def is_sun_out(self, epoch_timestamp):
        """
        Queries the RLE array in O(1) time to determine daylight status.

        The method first retrieves the 14-bit RLE data (Sunrise and Sunset 
        Intervals) and then calculates the current interval index to check 
        if it falls within the daylight run-length.

        :param epoch_timestamp: Time in seconds since the epoch (UTC).
        :return: True if sun is out, False otherwise.
        :raises ValueError: If the RLE array has not been initialized.
        """
        if self.packed_data == 0:
            raise ValueError("RLE array is empty or not initialized.")
            
        # 1. Calculate the Day Index (0-based)
        total_seconds_since_ref = int(epoch_timestamp) - int(self.REF_EPOCH_UTC)
        day_index = int(total_seconds_since_ref / self.SECONDS_PER_DAY)
        day_index = day_index % self.DAYS_IN_YEAR 

        # 2. O(1) Lookup: Retrieve RLE data for the day
        sunrise_index, sunset_index = self._get_day_rle_data(day_index)
        
        # 3. Calculate Current Interval Index (O(1))
        seconds_into_day = total_seconds_since_ref % self.SECONDS_PER_DAY 
        current_minutes = int(seconds_into_day / self.SECONDS_PER_MINUTE)
        current_interval_index = int(current_minutes / self.INTERVAL_MINUTES)
        
        # 4. Final O(1) Comparison
        # Check if the current interval falls within the daylight run-length
        is_daylight = (current_interval_index >= sunrise_index) and \
                      (current_interval_index < sunset_index)
        
        return is_daylight

# --- Example Usage (Simulating 365 days of data) ---

def run_rle_test():
    print("\n--- Running RLE Daylight Checker Test ---")
    
    # Simulate a full year's data for Seattle (simplified for example)
    daily_sun_data = []
    start_date = datetime(2025, 1, 1)
    
    for i in range(UtcRleDaylightChecker.DAYS_IN_YEAR):
        day = start_date + timedelta(days=i)
        date_key = day.strftime("%m-%d")
        
        # Simplified simulation of longer days in summer (mid-year)
        # Winter (Jan 1) -> approx 8-hour day (16:00-00:00 UTC shift for simplicity)
        # Summer (July 1) -> approx 16-hour day (08:00-00:00 UTC shift for simplicity)
        
        # Use a cyclical function to vary day length
        day_fraction = i / UtcRleDaylightChecker.DAYS_IN_YEAR
        
        # Night length variance (simplified sine wave for 8 to 16 hour day length)
        # Total minutes: 480 (8h) to 960 (16h)
        day_length_minutes = int(720 + 240 * math.cos(math.radians((day_fraction * 360) + 180)))
        
        # Fixed midpoint (Solar Noon) for simplicity: 18:00 UTC
        midpoint_minutes = 18 * 60
        half_length = day_length_minutes // 2
        
        sunrise_min = (midpoint_minutes - half_length) % 1440
        sunset_min = (midpoint_minutes + half_length) % 1440
        
        sunrise_time = f"{sunrise_min // 60:02d}:{sunrise_min % 60:02d}"
        sunset_time = f"{sunset_min // 60:02d}:{sunset_min % 60:02d}"

        daily_sun_data.append({
            "date": date_key, 
            "sunrise": sunrise_time, 
            "sunset": sunset_time
        })

    checker = UtcRleDaylightChecker()
    checker.create_rle_array(daily_sun_data)

    # --- Test Cases ---
    
    # Helper to get the UTC epoch for a specific day in 2025
    def get_test_epoch(month, day, hour, minute):
        dt = datetime(2025, month, day, hour, minute, tzinfo=timezone.utc)
        return dt.timestamp()

    print("\n--- Testing Lookups (O(1)) ---")

    # 1. Winter Test (Jan 1, 2025 - Day Length is Shortest)
    # Sunrise ~ 14:00 UTC, Sunset ~ 22:00 UTC (8-hour day)
    
    # Test 1a: Should be NIGHT (13:00 UTC)
    test_epoch_1a = get_test_epoch(1, 1, 13, 0)
    result_1a = checker.is_sun_out(test_epoch_1a)
    print(f"Jan 1st @ 13:00 UTC (Night): {'✅ PASS' if not result_1a else '❌ FAIL'}")

    # Test 1b: Should be DAYLIGHT (16:30 UTC)
    test_epoch_1b = get_test_epoch(1, 1, 16, 30)
    result_1b = checker.is_sun_out(test_epoch_1b)
    print(f"Jan 1st @ 16:30 UTC (Day): {'✅ PASS' if result_1b else '❌ FAIL'}")
    
    # 2. Summer Test (July 1, 2025 - Day Length is Longest)
    # Sunrise ~ 10:00 UTC, Sunset ~ 02:00 UTC next day (16-hour day)
    
    # Test 2a: Should be DAYLIGHT (09:00 UTC)
    test_epoch_2a = get_test_epoch(7, 1, 9, 0)
    result_2a = checker.is_sun_out(test_epoch_2a)
    print(f"Jul 1st @ 09:00 UTC (Day): {'✅ PASS' if result_2a else '❌ FAIL'}")

    # Test 2b: Should be NIGHT (03:00 UTC)
    test_epoch_2b = get_test_epoch(7, 1, 3, 0)
    result_2b = checker.is_sun_out(test_epoch_2b)
    print(f"Jul 1st @ 03:00 UTC (Night): {'✅ PASS' if not result_2b else '❌ FAIL'}")


# Include math module for the simulation
if __name__ == '__main__':
    import math
    
    # Simple cosine function for degrees
    def cos(angle):
        return math.cos(math.radians(angle))
    
    # Assign the function globally for the loop inside run_rle_test
    globals()['cos'] = cos
    
    run_rle_test()
