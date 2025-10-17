# ☀️ Compact Daylight Data Storage: Bit Mask & RLE Summary

This document summarizes the highly compressed method for storing a year's worth of daylight status data using Run-Length Encoding (RLE) and optimized byte-array serialization.

---

## 1. The Base Resolution: Fixed-Width Bit Mask

The conceptual foundation is a standard **Bit Mask**, where each time interval is represented by a single bit (`1` for daylight, `0` for night).

| Metric | Value | Rationale |
| :--- | :--- | :--- |
| **Resolution** | 15 minutes | Balances granularity and storage efficiency. |
| **Intervals/Day** | $\mathbf{96}$ | $1440 \text{ minutes} / 15 \text{ minutes}$ |
| **Storage/Day** | $\mathbf{96 \text{ bits}}$ | 1 bit per interval. |
| **Storage/Year** | $\approx \mathbf{4.5 \text{ KB}}$ | $365 \text{ days} \times 96 \text{ bits/day} / 8 \text{ bits/byte}$ |

---

## 2. The Compression: Run-Length Encoding (RLE)

To drastically reduce storage, RLE is used. Because the daylight pattern is predictable (Night $\rightarrow$ Daylight $\rightarrow$ Night), we only need to store the two transition points: the **Sunrise Interval Index** and the **Sunset Interval Index**.

The use of $\mathbf{15\text{-minute intervals}$ (96 total) allows for maximum compression efficiency.

### RLE Efficiency

| Index Range | Bit Requirement | Rationale |
| :--- | :--- | :--- |
| **Index Value** | $0 \text{ to } 95$ | Maximum interval index is 95. |
| **Bits/Index** | $\mathbf{7 \text{ bits}}$ | $\lceil \log_2(96) \rceil = 7$. Using 7 bits is possible because $2^7 = 128$. |
| **RLE Storage/Day**| $\mathbf{14 \text{ bits}}$ | $7 \text{ bits (Sunrise)} + 7 \text{ bits (Sunset)}$ |
| **RLE Storage/Year**| $\approx \mathbf{640 \text{ bytes}}$ | $365 \text{ days} \times 14 \text{ bits/day} / 8 \text{ bits/byte}$ |
| **Compression Ratio** | $\approx \mathbf{85\%}$ | Reduction from 96 bits/day to 14 bits/day. |

### RLE Packing Formula (Conceptual)

The full RLE Array is a single large integer, `Packed_Data`, where each day's 14-bit segment is concatenated. The following shows how the segment is constructed:

$$\text{Day Segment} = (\text{Sunset Index} \ll 7) \mid (\text{Sunrise Index})$$

---

## 3. Serialization: Raw Byte Array Export

To maximize compactness, the final `Packed_Data` integer is stored as a **raw byte array** (binary file) instead of a text-based format like Base64 (which adds 33% overhead).

### Advantages of Raw Byte Export

* **Zero Overhead:** The file size is the theoretical minimum (e.g., 640 bytes).
* **8-Bit Cleanliness:** Guarantees data integrity by avoiding text-encoding issues.
* **Fast I/O:** No encoding/decoding overhead during file operations.

### Serialization Formula

$$\text{Byte Array} = \text{Packed\_Data} \to \text{to\_bytes}(\text{length}=\mathbf{640}, \text{byteorder}='big')$$

---

## 4. Optimization: Byte Range Loading (Partial Read)

For applications that only need the current day's data, the entire 640-byte array does not need to be loaded. We can calculate the exact location of the current day's 14-bit RLE segment and only read that small fragment (always **2 bytes**) from the binary file.

### Byte Offset Calculation

The `Day Index` is $0$ for Jan 1st, $364$ for Dec 31st.

| Parameter | Formula | Rationale |
| :--- | :--- | :--- |
| **Start Bit Index** | $\text{Day Index} \times 14$ | The absolute bit position of the 14-bit segment. |
| **Byte Offset** | $\lfloor \text{Start Bit Index} / 8 \rfloor$ | The starting byte address to seek to in the file. |
| **Read Size** | $\mathbf{2 \text{ bytes}}$ | Guaranteed size to capture the full 14 bits, regardless of bit alignment. |

### Targeted Data Isolation

After reading the 2-byte fragment into a 16-bit integer (`Fragment_Int`), the 14-bit segment is extracted using bit-shifting and masking:

1.  **Shift Right:** Determine the required shift amount to align the 14 bits to the Least Significant Bit (LSB).
2.  **Mask:** Apply a 14-bit mask ($2^{14} - 1$) to isolate the final RLE value.

This optimization drastically reduces I/O latency for a daily startup check.
