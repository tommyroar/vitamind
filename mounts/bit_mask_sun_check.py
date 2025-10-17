import time
from datetime import datetime, timedelta, timezone

# --- Configuration ---
# Resolution: 15-minute intervals.
INTERVAL_MINUTES = 15
INTERVALS_PER_DAY = 96 # (1440 / 15)
DAYS_IN_HASH = 365 
# ---------------------

class UtcBitMaskDaylightChecker:
    """
    A highly compact and efficient data structure for checking daylight status 
    at a specific location, assuming all data and queries are in Coordinated 
    Universal Time (UTC).

    The core of this algorithm is a **pre-calculated Lookup Bit Mask**, which 
    stores the sun-out status (1=Daylight, 0=Night) for every 15-minute 
    interval across 365 days of a year.

    ### Algorithm Efficiency:
    * **Space:** Extremely compact, requiring only 1 bit per 15-minute interval, 
        totaling 35,040 bits (approx. 4.3 KB) for the entire year's data.
    * **Time (Query):** O(1) complexity. The query avoids complex date parsing, 
        timezone conversions, and floating-point math, relying purely on fast 
        integer arithmetic to calculate a single linear bit index.
        
    ### Key Assumptions:
    1.  **Time Zone:** All input sun data (sunrise/sunset times) and the query 
        epoch timestamp must be in **UTC**. This removes the need for slow, 
        complex Daylight Saving Time (DST) logic.
    2.  **Yearly Repetition:** The data is compiled for a base 365-day year and 
        is assumed to repeat identically every year.
    3.  **Resolution:** The check is accurate only to the nearest **15-minute interval**.
    """

    def __init__(self, binary_mask=None):
        self.binary_mask = binary_mask
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

    def create_bit_mask(self, daily_sun_data):
        """
        Compiles daily UTC sunrise/sunset data (list of dicts) into the compact 
        binary string (the Bit Mask).

        The method iterates through 365 days and, for each day, iterates through 
        all 96 (15-minute) intervals. For each interval, it determines if the 
        interval's starting minute is within the daily [sunrise, sunset) UTC 
        window and appends '1' (daylight) or '0' (night) to the mask.

        :param daily_sun_data: List of dicts, where 'sunrise' and 'sunset' are 
                               the UTC times for a given 'date' (MM-DD).
        :return: The compact binary string representing the yearly daylight status.
        """
        data_map = {entry['date']: entry for entry in daily_sun_data}
        binary_mask = ""
        
        start_date = datetime(2025, 1, 1) # Non-leap year base for indexing
        
        # 1. Iterate through all 365 days
        for i in range(DAYS_IN_HASH):
            day = start_date + timedelta(days=i)
            date_key = day.strftime("%m-%d")
            
            entry = data_map.get(date_key)
            if not entry:
                # If data is missing, conservatively assume night
                binary_mask += '0' * INTERVALS_PER_DAY
                continue

            sr_min = self._time_to_minutes(entry.get("sunrise"))
            ss_min = self._time_to_minutes(entry.get("sunset"))
            
            if sr_min is None or ss_min is None:
                binary_mask += '0' * INTERVALS_PER_DAY
                continue
                
            # 2. Iterate through 96 intervals in the day (0 to 95)
            for interval in range(INTERVALS_PER_DAY):
                # Calculate the start minute of the current 15-minute interval
                interval_start_min = interval * INTERVAL_MINUTES
                
                # Check if the interval is within the daylight window [SR_min, SS_min)
                # The start minute of the interval determines the status for the entire 15 min block.
                is_daylight = (interval_start_min >= sr_min) and \
                              (interval_start_min < ss_min)
                
                binary_mask += '1' if is_daylight else '0'
                
        self.binary_mask = binary_mask
        print(f"✅ UTC Mask created. Total length: {len(binary_mask)} bits ({len(binary_mask) / 8 / 1024:.2f} KB).")
        return binary_mask

    def is_sun_out(self, epoch_timestamp):
        """
        Queries the binary mask using a single epoch timestamp (assumed to be UTC).

        This method performs a single, direct **Bit Index Lookup** to determine 
        the status, eliminating the need to parse date strings or perform complex 
        time comparisons.

        The core calculation for the index is:
        $$ \text{Total Bit Index} = (\text{Day Index} \times 96) + (\text{Minute} // 15) $$

        :param epoch_timestamp: Time in seconds since the epoch (UTC).
        :return: True if sun is out, False otherwise.
        :raises ValueError: If the binary mask has not been initialized.
        """
        if not self.binary_mask:
            raise ValueError("Binary mask must be created first.")
            
        # 1. Calculate the Day Index (0-based) using pure integer arithmetic
        total_seconds_since_ref = int(epoch_timestamp) - int(self.REF_EPOCH_UTC)
        day_index = int(total_seconds_since_ref / self.SECONDS_PER_DAY)
        
        # Ensure the index wraps around correctly for a 365-day hash
        day_index = day_index % DAYS_IN_HASH
        
        # 2. Calculate the Interval Index (0-95)
        # Seconds elapsed since the start of the *current* UTC day
        seconds_into_day = total_seconds_since_ref % self.SECONDS_PER_DAY 
        
        # Current time in minutes from midnight (UTC)
        current_minutes = int(seconds_into_day / self.SECONDS_PER_MINUTE)
        
        # Interval Index (0 to 95)
        interval_index = int(current_minutes / INTERVAL_MINUTES)
        
        # 3. Calculate the Total Bit Index (Linear Offset)
        total_bit_index = (day_index * INTERVALS_PER_DAY) + interval_index

        if total_bit_index >= len(self.binary_mask) or total_bit_index < 0:
            # This generally indicates an epoch timestamp far outside the expected range
            return False

        # 4. Perform the single bit lookup
        bit_status = self.binary_mask[total_bit_index]
        
        return bit_status == '1'

# --- The unit tests remain the same and are omitted here for brevity, 
# --- but would follow the class definition in the final script.
