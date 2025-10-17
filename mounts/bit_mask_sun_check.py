from datetime import datetime, timedelta, timezone
import math # Included for the simulation logic

class UtcRleDaylightChecker:
    """
    A highly compressed data structure for checking daylight status using 
    Run-Length Encoding (RLE), assuming all times are in UTC.

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

    # --- RLE Configuration ---
    INTERVAL_MINUTES = 15
    INTERVALS_PER_DAY = 96 # Max index is 95
    DAYS_IN_YEAR = 365
    BITS_PER_INDEX = 7     # 7 bits can encode 0-127, sufficient for 0-95
    BITS_PER_DAY = BITS_PER_INDEX * 2  # 14 bits/day
    TOTAL_BITS = DAYS_IN_YEAR * BITS_PER_DAY # 5110 bits
    
    # Calculate bytes needed: ceiling(TOTAL_BITS / 8)
    BYTES_NEEDED = (TOTAL_BITS + 7) // 8 # 640 bytes (for 5110 bits)
    INDEX_MASK = (1 << BITS_PER_INDEX) - 1 # Mask for 7 bits (127)
    # -------------------------

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
        ... (Existing docstring content omitted for brevity) ...
        """
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

    # Alias for the core serialization method
    def export_to_byte_array(self):
        """
        Converts the RLE's single large integer into a raw byte array.
        
        ### Advantages for Storage (Maximum Compactness)
        1.  **Zero Overhead:** The array is stored at its theoretical minimum size 
            (5110 bits requires exactly 640 bytes), unlike Base64 encoding which 
            adds ~33% overhead, or text storage which is highly inefficient.
        2.  **Binary Integrity:** Storing as a raw byte array ensures **8-bit cleanliness**, 
            preventing corruption from system-specific text encodings or line-ending 
            conversions during file transfer.
        3.  **Fast I/O:** Avoids the CPU cost and time needed for character set 
            encoding/decoding, leading to faster file reads and writes.
        
        :return: bytes object representing the packed data (e.g., 640 bytes).
        :raises ValueError: If the RLE array is not initialized.
        """
        if self.packed_data == 0:
            raise ValueError("Cannot export uninitialized RLE array (packed_data is 0).")
        
        # Convert the large integer into the exact number of bytes required.
        byte_data = self.packed_data.to_bytes(
            self.BYTES_NEEDED, 
            byteorder='big' # Big-endian for cross-platform consistency
        )
        
        print(f"✅ Data exported as {len(byte_data)} raw bytes.")
        return byte_data

    @classmethod
    def import_from_byte_array(cls, byte_data):
        """
        Converts a raw byte array read from a file back into the single RLE integer 
        and initializes a new UtcRleDaylightChecker instance.

        :param byte_data: The bytes object read from the binary file.
        :return: UtcRleDaylightChecker instance initialized with the data.
        """
        # Convert the byte array back into a single large integer.
        packed_data = int.from_bytes(
            byte_data, 
            byteorder='big'
        )
        
        return cls(packed_data)

    def _get_day_rle_data(self, day_index):
        # ... (Existing _get_day_rle_data method omitted for brevity) ...
        # Calculate distance from the LSB end (Day 364)
        days_from_end = self.DAYS_IN_YEAR - 1 - day_index
        shift_amount = days_from_end * self.BITS_PER_DAY
        shifted_value = self.packed_data >> shift_amount
        rle_segment = shifted_value & ((1 << self.BITS_PER_DAY) - 1)
        sunset_index = rle_segment >> self.BITS_PER_INDEX
        sunrise_index = rle_segment & self.INDEX_MASK
        return sunrise_index, sunset_index

    def is_sun_out(self, epoch_timestamp):
        # ... (Existing is_sun_out method omitted for brevity) ...
        if self.packed_data == 0:
            raise ValueError("RLE array is empty or not initialized.")
            
        total_seconds_since_ref = int(epoch_timestamp) - int(self.REF_EPOCH_UTC)
        day_index = (int(total_seconds_since_ref / self.SECONDS_PER_DAY)) % self.DAYS_IN_YEAR 

        sunrise_index, sunset_index = self._get_day_rle_data(day_index)
        
        seconds_into_day = total_seconds_since_ref % self.SECONDS_PER_DAY 
        current_minutes = int(seconds_into_day / self.SECONDS_PER_MINUTE)
        current_interval_index = int(current_minutes / self.INTERVAL_MINUTES)
        
        is_daylight = (current_interval_index >= sunrise_index) and \
                      (current_interval_index < sunset_index)
        
        return is_daylight

