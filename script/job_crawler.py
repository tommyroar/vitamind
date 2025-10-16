import os
from datetime import datetime
from tabulate import tabulate

# --- 1. Define Paths ---
REPORT_FILE_PATH = "src/latest_report.md"

# --- 2. Mock Data Retrieval (Replace with your actual scraping logic) ---

# In a real scenario, this is the structured data returned by your crawler
job_data = [
    ["Senior Backend Engineer", "Acme Inc.", "[Apply Here](https://acme.com/apply/be)"],
    ["Data Scientist (Remote)", "DataFlow Analytics", "[Apply Here](https://dataflow.ai/jobs/ds)"],
    ["Junior DevOps Analyst", "Cloud9 Solutions", "[Apply Here](https://cloud9.io/devops)"],
]

# Define headers for the Markdown table
headers = ["Job Title", "Company", "Application Link"]

# --- 3. Generate Markdown Content ---
# Use tabulate to generate the Markdown table content
table_markdown = tabulate(
    job_data,
    headers=headers,
    tablefmt="github" # 'github' format is clean and widely compatible Markdown
)

report_content = f"""# Job Crawler Latest Report

*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC)*

This page provides the latest findings from the scheduled job crawling script. The links are live at the time of generation.

{table_markdown}

## Methodology

The crawler targets specific job boards and filters for keywords related to 'Software' and 'Data'. Only jobs posted within the last 72 hours are included in this report.
"""

# --- 4. Write Content to mdBook Source Directory ---
try:
    # Ensure the 'src' directory exists before writing
    os.makedirs(os.path.dirname(REPORT_FILE_PATH), exist_ok=True)
    
    with open(REPORT_FILE_PATH, "w") as f:
        f.write(report_content)
        
    print(f"✅ Success: Data report written to {REPORT_FILE_PATH}")

except Exception as e:
    print(f"❌ Error writing report: {e}")

# Note: The GitHub Action workflow handles updating SUMMARY.md and deployment.

