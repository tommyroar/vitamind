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
    at a specific location, assuming ALL times (sun data and epoch) are in UTC.
    
    ... (Existing docstring content omitted for brevity) ...
    """

    def __init__(self, binary_mask=None):
        self.binary_mask = binary_mask if binary_mask else ""
        # Reference epoch for 2025-01-01 00:00:00 UTC
        self.REF_EPOCH_UTC = datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp()
        self.SECONDS_PER_DAY = 24 * 60 * 60
        self.SECONDS_PER_MINUTE = 60 # Added for internal consistency

    def _time_to_minutes(self, time_str):
        """Converts HH:MM time string to total minutes from midnight (0-1439)."""
        try:
            H, M = map(int, time_str.split(':'))
            return H * 60 + M
        except Exception:
            return None

    def create_bit_mask(self, daily_sun_data):
        """
        Compiles daily UTC sunrise/sunset data into the compact binary string (the Bit Mask).
        
        ... (Existing docstring content omitted for brevity) ...
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
                binary_mask += '0' * INTERVALS_PER_DAY
                continue

            sr_min = self._time_to_minutes(entry.get("sunrise"))
            ss_min = self._time_to_minutes(entry.get("sunset"))
            
            if sr_min is None or ss_min is None:
                binary_mask += '0' * INTERVALS_PER_DAY
                continue
                
            # 2. Iterate through 96 intervals in the day (0 to 95)
            for interval in range(INTERVALS_PER_DAY):
                interval_start_min = interval * INTERVAL_MINUTES
                
                is_daylight = (interval_start_min >= sr_min) and \
                              (interval_start_min < ss_min)
                
                binary_mask += '1' if is_daylight else '0'
                
        self.binary_mask = binary_mask
        print(f"✅ UTC Mask created. Total length: {len(binary_mask)} bits.")
        return binary_mask

    def append_to_mask(self, daily_sun_data_to_append):
        """
        Efficiently appends new, variable-sized daylight data to the existing 
        binary mask.

        This method first compiles the new sunrise/sunset data into a contiguous 
        binary string, then simply concatenates it to the end of the existing 
        `self.binary_mask`. This avoids the costly operation of rebuilding the 
        entire mask from the beginning.
        
        Note: The querying method (`is_sun_out`) relies on the mask being indexed 
        by date relative to the starting year (2025). Appending data past the 
        365th day means the `is_sun_out` method needs to be adapted or only 
        used with the original 365-day set. However, for a simple contiguous 
        data stream, this method is optimal.

        :param daily_sun_data_to_append: List of dicts for the new days.
        :return: The updated binary mask string.
        """
        new_binary_segment = ""
        
        # NOTE: This loop structure is slightly different from `create_bit_mask` 
        # as it only processes the provided days, not a full 365-day cycle.
        
        for entry in daily_sun_data_to_append:
            sr_min = self._time_to_minutes(entry.get("sunrise"))
            ss_min = self._time_to_minutes(entry.get("sunset"))

            if sr_min is None or ss_min is None:
                new_binary_segment += '0' * INTERVALS_PER_DAY
                continue
                
            # Generate the 96 bits for this single day
            day_segment = ""
            for interval in range(INTERVALS_PER_DAY):
                interval_start_min = interval * INTERVAL_MINUTES
                
                is_daylight = (interval_start_min >= sr_min) and \
                              (interval_start_min < ss_min)
                
                day_segment += '1' if is_daylight else '0'
            
            new_binary_segment += day_segment

        # Efficient string concatenation (O(N) where N is the size of the new segment)
        self.binary_mask += new_binary_segment
        print(f"✅ Appended {len(new_binary_segment)} bits. New total length: {len(self.binary_mask)} bits.")
        return self.binary_mask


    def is_sun_out(self, epoch_timestamp):
        """
        Queries the binary mask using a single epoch timestamp (assumed to be UTC).
        (O(1) operation, pure integer math).

        ... (Existing docstring content omitted for brevity) ...
        """
        if not self.binary_mask:
            raise ValueError("Binary mask must be created first.")
            
        # 1. Calculate the Day Index (0-based) using UTC epoch difference
        total_seconds_since_ref = int(epoch_timestamp) - int(self.REF_EPOCH_UTC)
        day_index = int(total_seconds_since_ref / self.SECONDS_PER_DAY)
        
        # Constrain to the first 365 days if the mask wasn't designed for multi-year index
        day_index = day_index % DAYS_IN_HASH 
        
        # 2. Calculate the Interval Index (0-95)
        seconds_into_day = total_seconds_since_ref % self.SECONDS_PER_DAY 
        current_minutes = int(seconds_into_day / self.SECONDS_PER_MINUTE)
        interval_index = int(current_minutes / INTERVAL_MINUTES)
        
        # 3. Calculate the Total Bit Index (O(1) operation)
        total_bit_index = (day_index * INTERVALS_PER_DAY) + interval_index

        if total_bit_index >= len(self.binary_mask) or total_bit_index < 0:
            print(f"Error: Index {total_bit_index} out of bounds.")
            return False

        # 4. Perform the single bit lookup
        bit_status = self.binary_mask[total_bit_index]
        
        return bit_status == '1'

# --- Unit Test for the New Append Method ---
def run_append_test():
    print("\n--- Running Append Method Test ---")
    
    # Initialize the checker with a small, 2-day mask
    initial_data = [
        {"date": "01-01", "sunrise": "16:00", "sunset": "24:00"}, # Day 1: 16:00 to 24:00 (8 hours, 32 '1's)
        {"date": "01-02", "sunrise": "16:15", "sunset": "24:15"}  # Day 2: 16:15 to 24:15 (8 hours, 32 '1's)
    ]
    
    checker = UtcBitMaskDaylightChecker()
    checker.binary_mask = "" # Ensure it starts empty before compilation
    
    # Manually compile a short, 2-day mask (192 bits)
    # Note: Using create_bit_mask isn't suitable here as it requires 365 days of input data.
    # We will manually compile the initial segment for testing flexibility.
    
    # 1. Create a simplified initial mask (16:00 to 24:00 -> interval 64 to 95)
    # Day 1: 16:00 is 64th interval (64*15=960 min). Mask is 64 '0's + 32 '1's
    day1_mask = '0' * 64 + '1' * 32
    # Day 2: 16:15 is 65th interval (65*15=975 min). Mask is 65 '0's + 31 '1's
    day2_mask = '0' * 65 + '1' * 31
    initial_mask = day1_mask + day2_mask
    checker.binary_mask = initial_mask
    
    initial_length = len(checker.binary_mask)
    expected_initial_length = 2 * INTERVALS_PER_DAY
    print(f"Initial Mask Length (2 Days): {initial_length} bits. (Expected: {expected_initial_length})")
    
    # Data to append (1 day)
    append_data = [
        {"date": "01-03", "sunrise": "10:00", "sunset": "14:00"} # 10:00 to 14:00 (4 hours, 16 '1's)
    ]
    
    # 2. Append the new data
    new_mask = checker.append_to_mask(append_data)
    
    # 3. Verification
    appended_length = len(new_mask) - initial_length
    expected_appended_length = INTERVALS_PER_DAY # 96 bits
    expected_final_length = initial_length + expected_appended_length
    
    passed_length_check = (len(new_mask) == expected_final_length)
    
    print(f"Appended Segment Length: {appended_length} bits. (Expected: {expected_appended_length})")
    print(f"Final Mask Length: {len(new_mask)} bits. (Expected: {expected_final_length})")
    print(f"Result: [{'✅ PASS' if passed_length_check else '❌ FAIL'}] Length Check.")
    
    # Verification of Content (The appended day has 4 hours (16 intervals) of daylight)
    # The new segment is the last 96 bits.
    final_segment = new_mask[-INTERVALS_PER_DAY:]
    count_ones = final_segment.count('1')
    
    passed_content_check = (count_ones == 16)
    print(f"Ones in Appended Segment: {count_ones}. (Expected: 16)")
    print(f"Result: [{'✅ PASS' if passed_content_check else '❌ FAIL'}] Content Check.")
    
    if passed_length_check and passed_content_check:
        print("\nAll append tests passed. The data was appended correctly.")
    else:
        print("\nOne or more append tests failed.")


if __name__ == '__main__':
    run_append_test()
