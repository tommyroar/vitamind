import os
from datetime import datetime, timedelta, timezone
import math
import time

class UtcRleDaylightChecker:
    """
    A highly compressed data structure for checking daylight status using 
    Run-Length Encoding (RLE). Optimized for O(1) queries and compact storage.

    ### Algorithm: Indexed RLE (Run-Length Encoding)
    Stores two 7-bit interval indices per day (Sunrise Index, Sunset Index) 
    in a single large integer, resulting in **14 bits per day** of storage.
        
    ### Efficiency:
    * **Space:** ~85% reduction compared to a 96-bit fixed mask.
    * **Time (Query):** O(1) via direct 14-bit lookup and comparison.
        
    ### Key Assumptions:
    1.  **Time Zone:** All input sun data and the query epoch timestamp must be in **UTC**.
    2.  **Resolution:** Accurate only to the nearest **15-minute interval**.
    3.  **Data Range:** Data is stored for a 365-day cycle.
    """

    # --- RLE Configuration (Constants) ---
    INTERVAL_MINUTES = 15
    INTERVALS_PER_DAY = 96 
    DAYS_IN_YEAR = 365
    BITS_PER_INDEX = 7     
    BITS_PER_DAY = BITS_PER_INDEX * 2  # 14 bits/day
    TOTAL_BITS = DAYS_IN_YEAR * BITS_PER_DAY # 5110 bits
    
    # Calculate bytes needed: ceiling(TOTAL_BITS / 8)
    BYTES_NEEDED = (TOTAL_BITS + 7) // 8 # 640 bytes for a full year
    INDEX_MASK = (1 << BITS_PER_INDEX) - 1 # Mask for 7 bits (127)
    
    # Constant used for reading only one day (14 bits can span 2 bytes)
    BYTES_PER_DAY_FRAGMENT = 2 
    # -------------------------------------

    def __init__(self, packed_data=0):
        self.packed_data = packed_data 
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
        """Compiles daily UTC sunrise/sunset data into a single, compact, bit-packed integer."""
        data_map = {entry['date']: entry for entry in daily_sun_data}
        packed_data = 0
        start_date = datetime(2025, 1, 1) 
        
        for i in range(self.DAYS_IN_YEAR - 1, -1, -1):
            day = start_date + timedelta(days=i)
            date_key = day.strftime("%m-%d")
            entry = data_map.get(date_key)
            
            if entry:
                sr_min = self._time_to_minutes(entry.get("sunrise"))
                ss_min = self._time_to_minutes(entry.get("sunset"))
                sunrise_index = int(sr_min / self.INTERVAL_MINUTES) if sr_min is not None else 0
                sunset_index = int(ss_min / self.INTERVAL_MINUTES) if ss_min is not None else 0
            else:
                sunrise_index = 0
                sunset_index = 0
            
            sunrise_index = min(sunrise_index, self.INTERVALS_PER_DAY)
            sunset_index = min(sunset_index, self.INTERVALS_PER_DAY)
                
            day_segment = (sunset_index << self.BITS_PER_INDEX) | sunrise_index
            packed_data <<= self.BITS_PER_DAY
            packed_data |= day_segment
            
        self.packed_data = packed_data
        print(f"✅ RLE Array created. Total storage: {packed_data.bit_length()} bits ({self.BYTES_NEEDED} bytes).")
        return packed_data

    def export_to_byte_array(self):
        """
        Converts the RLE's single large integer into a raw byte array for maximum compactness.
        ... (Docstring content omitted for brevity) ...
        """
        if self.packed_data == 0:
            raise ValueError("Cannot export uninitialized RLE array (packed_data is 0).")
        
        byte_data = self.packed_data.to_bytes(
            self.BYTES_NEEDED, 
            byteorder='big'
        )
        
        return byte_data

    @classmethod
    def import_from_byte_array(cls, byte_data):
        """
        Converts a raw byte array read from a file back into the single RLE integer 
        and initializes a new UtcRleDaylightChecker instance.
        """
        packed_data = int.from_bytes(
            byte_data, 
            byteorder='big'
        )
        
        return cls(packed_data)
    
    # --- Targeted Daily Import Methods ---

    @staticmethod
    def get_current_day_offset_and_size(target_timestamp=None):
        """
        Calculates the exact byte offset and size needed to read the 14-bit RLE data 
        for the target day from the binary file.

        The core challenge is that the 14-bit RLE segment is not byte-aligned; 
        it can start anywhere. The method ensures a **2-byte fragment** is read 
        to capture the entire 14-bit segment.

        :param target_timestamp: Optional. An epoch timestamp to query. Defaults to the current moment (UTC).
        :return: Tuple (byte_offset, read_size_bytes, day_index).
        """
        # Determine current date's 0-based index (0=Jan 1, 364=Dec 31)
        if target_timestamp:
            dt_utc = datetime.fromtimestamp(target_timestamp, timezone.utc)
        else:
            dt_utc = datetime.now(timezone.utc)
            
        # Reference day is Jan 1 of the current year
        ref_dt = datetime(dt_utc.year, 1, 1, tzinfo=timezone.utc)
        day_index = (dt_utc - ref_dt).days % UtcRleDaylightChecker.DAYS_IN_YEAR
        
        # 1. Calculate the starting bit position of the current day's 14-bit RLE segment
        # Since the array is packed MSB-first (Day 0 at the start of the bit stream)
        start_bit_index = day_index * UtcRleDaylightChecker.BITS_PER_DAY
        
        # 2. Calculate the byte offset (floor division by 8)
        byte_offset = start_bit_index // 8
        
        # 3. Determine the read size in bytes
        # 14 bits requires at most 2 bytes of context.
        read_size_bytes = UtcRleDaylightChecker.BYTES_PER_DAY_FRAGMENT
        
        return byte_offset, read_size_bytes, day_index

    @classmethod
    def import_current_day_data(cls, file_path, target_timestamp=None):
        """
        🎯 **Optimized for Single-Day Lookup:** Loads **only the 2-byte fragment** from the binary file that contains the RLE data for the current/target day.

        This method improves performance by avoiding the loading of the full 640-byte 
        array for a single daily check. It then uses bit-shifting to isolate the 
        14-bit RLE segment and initializes the checker with a sparse data structure.

        :param file_path: Path to the binary RLE data file.
        :param target_timestamp: Optional. Epoch time to query. Defaults to now (UTC).
        :return: A new UtcRleDaylightChecker instance ready for O(1) query.
        """
        offset, size, day_index = cls.get_current_day_offset_and_size(target_timestamp)
        
        try:
            with open(file_path, 'rb') as f:
                f.seek(offset)
                byte_fragment = f.read(size)
        except FileNotFoundError:
            raise FileNotFoundError(f"RLE data file not found at: {file_path}")
        except Exception as e:
            raise IOError(f"Error reading RLE file at offset {offset}: {e}")

        if not byte_fragment:
            raise ValueError("Failed to read required byte fragment from file.")

        # --- Isolate the 14-bit RLE segment from the 2-byte fragment ---
        
        # 1. Convert the 2-byte fragment (16 bits) into an integer
        fragment_int = int.from_bytes(byte_fragment, byteorder='big')

        # 2. Calculate the total bits read (usually 16)
        total_bits_read = len(byte_fragment) * 8
        
        # 3. Determine the right-shift needed to align the 14-bit segment to the LSB
        start_bit_index_full = day_index * cls.BITS_PER_DAY
        
        # Bits from the end of the fragment to the end of the RLE segment
        bits_to_shift_right = (offset * 8) + total_bits_read - (start_bit_index_full + cls.BITS_PER_DAY)

        # 4. Shift and mask to isolate the 14-bit value
        aligned_segment = fragment_int >> bits_to_shift_right
        rle_mask_14_bit = (1 << cls.BITS_PER_DAY) - 1
        current_day_rle_value = aligned_segment & rle_mask_14_bit

        # --- Populate a Sparse Array for the existing O(1) query logic ---
        # The query logic relies on the day's RLE value being at a specific bit position 
        # based on the day_index. We create a full-sized, mostly zero array with 
        # only the current day's data populated correctly.
        days_from_end = cls.DAYS_IN_YEAR - 1 - day_index
        total_shift = days_from_end * cls.BITS_PER_DAY
        
        sparse_packed_data = current_day_rle_value << total_shift

        instance = cls(sparse_packed_data)
        
        print(f"  Loaded RLE data for Day {day_index} ({size} bytes loaded).")
        return instance

    def _get_day_rle_data(self, day_index):
        """
        Performs the core O(1) bit lookup to retrieve the 14-bit RLE data for a 
        given day index.
        """
        days_from_end = self.DAYS_IN_YEAR - 1 - day_index
        shift_amount = days_from_end * self.BITS_PER_DAY
        shifted_value = self.packed_data >> shift_amount
        rle_segment = shifted_value & ((1 << self.BITS_PER_DAY) - 1)
        sunset_index = rle_segment >> self.BITS_PER_INDEX
        sunrise_index = rle_segment & self.INDEX_MASK
        return sunrise_index, sunset_index

    def is_sun_out(self, epoch_timestamp):
        """
        Queries the RLE array in O(1) time to determine daylight status.
        ... (Docstring content omitted for brevity) ...
        """
        if self.packed_data == 0:
            # Note: This check allows the sparse array from import_current_day_data 
            # to pass, as it is populated with the one relevant day.
            raise ValueError("RLE array is empty or not initialized.")
            
        total_seconds_since_ref = int(epoch_timestamp) - int(self.REF_EPOCH_UTC)
        day_index = (int(total_seconds_since_ref / self.SECONDS_PER_DAY)) % self.DAYS_IN_YEAR 

        # This lookup is O(1)
        sunrise_index, sunset_index = self._get_day_rle_data(day_index)
        
        seconds_into_day = total_seconds_since_ref % self.SECONDS_PER_DAY 
        current_minutes = int(seconds_into_day / self.SECONDS_PER_MINUTE)
        current_interval_index = int(current_minutes / self.INTERVAL_MINUTES)
        
        is_daylight = (current_interval_index >= sunrise_index) and \
                      (current_interval_index < sunset_index)
        
        return is_daylight
