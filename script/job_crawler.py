import os
from datetime import datetime
from tabulate import tabulate

# --- Configuration ---
REPORT_FILE_PATH = "src/latest_report.md"

# --- Dummy Data Generation with tabulate ---
def generate_report_data():
    """Generates simple structured data for tabulate."""
    headers = ["Component", "Status", "Last Check"]
    
    # Dummy data demonstrating tabulate usage
    data = [
        ["Python Environment", "✅ SUCCESS", datetime.now().strftime('%H:%M:%S')],
        ["Tabulate Library", "✅ SUCCESS", datetime.now().strftime('%H:%M:%S')],
        ["mdBook Directory", "❓ PENDING (Created by Build Step)", "N/A"]
    ]
    
    # Use tabulate to generate the Markdown table content
    table_markdown = tabulate(
        data,
        headers=headers,
        tablefmt="github" # GitHub format is compatible with mdBook
    )
    
    return table_markdown

# --- Content Generation ---

if __name__ == "__main__":
    
    table_content = generate_report_data()
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    report_content = f"""# System Status Check

*Generated on: {current_time} (UTC)*

This page confirms that the Python script successfully executed and used the **tabulate** library to structure the data for mdBook.

{table_content}

---

### Purpose
The successful execution of this script confirms that the action steps (Python setup, dependency install, and file output) are correct, allowing the mdBook build step to proceed.
"""

    # --- Write Content to mdBook Source Directory ---
    try:
        # Ensure the 'src' directory exists before writing
        os.makedirs(os.path.dirname(REPORT_FILE_PATH), exist_ok=True)
        
        with open(REPORT_FILE_PATH, "w") as f:
            f.write(report_content)
            
        print(f"✅ Success: Data report written to {REPORT_FILE_PATH}")

    except Exception as e:
        print(f"❌ Error writing report: {e}")

