import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime
from tabulate import tabulate

# --- Configuration ---
JOB_SEARCH_URL = "https://jobs.apple.com/en-us/search?search=Engineering+Manager&sort=relevance&location=seattle-SEA"
REPORT_FILE_PATH = "src/latest_report.md"

# --- 1. Scrape Job Listings ---
def scrape_apple_jobs():
    """
    Fetches the Apple job search page and extracts job titles, links, and locations.
    Returns a list of lists: [[Title, Company, Location, Link], ...]
    """
    print(f"📡 Starting scrape of: {JOB_SEARCH_URL}")
    job_data = []
    
    try:
        # Use a user-agent to mimic a browser, which helps avoid some blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(JOB_SEARCH_URL, headers=headers, timeout=15)
        response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # NOTE: Apple's job site uses unique classes and potentially dynamic loading.
        # We target the main job list container and then individual rows.
        # This structure is based on analysis of a static search result page.
        job_rows = soup.find_all('tr', class_='table-row')
        
        if not job_rows:
            print("⚠️ Warning: Could not find any job rows. Check selector or site structure.")
            return []

        for row in job_rows:
            # 1. Extract Link and Title (usually in the first column)
            title_link_tag = row.find('a', class_='table-col-1')
            if not title_link_tag:
                continue

            job_title = title_link_tag.text.strip()
            # Apple uses relative paths, so we prepend the base URL
            relative_link = title_link_tag['href']
            job_link = f"https://jobs.apple.com{relative_link}"
            
            # 2. Extract Location (usually in the second column)
            location_tag = row.find('span', class_='job-location')
            location_text = location_tag.text.strip().replace('\n', ' ') if location_tag else 'N/A'
            
            # Format the link for Markdown display
            markdown_link = f"[Apply Now]({job_link})"
            
            job_data.append([
                job_title, 
                "Apple", # Company is fixed for this scrape
                location_text,
                markdown_link
            ])

        print(f"✅ Found {len(job_data)} jobs.")
        return job_data

    except requests.exceptions.RequestException as e:
        print(f"❌ Error during network request: {e}")
        return []
    except Exception as e:
        print(f"❌ An unexpected error occurred during scraping: {e}")
        return []


# --- 2. Main Logic to Generate and Write File ---
if __name__ == "__main__":
    
    # Run the scraper
    scraped_jobs = scrape_apple_jobs()
    
    if not scraped_jobs:
        # Provide fallback content if scraping fails
        scraped_jobs = [["(Scraping Failed or No Jobs Found)", "N/A", "N/A", "N/A"]]


    # Define headers for the Markdown table
    headers = ["Job Title", "Company", "Location", "Application Link"]

    # Use tabulate to generate the Markdown table content
    table_markdown = tabulate(
        scraped_jobs,
        headers=headers,
        tablefmt="github" # 'github' format is clean and widely compatible Markdown
    )

    report_content = f"""# Engineering Manager Report (Seattle)

*Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} (UTC)*

The following jobs were found on the dedicated Apple job search page:

{table_markdown}

---
## Scraper Details

* **Target URL:** `{JOB_SEARCH_URL}`
* **Total Listings Found:** {len(scraped_jobs)}
"""

    # Write Content to mdBook Source Directory
    try:
        # Ensure the 'src' directory exists before writing
        os.makedirs(os.path.dirname(REPORT_FILE_PATH), exist_ok=True)
        
        with open(REPORT_FILE_PATH, "w") as f:
            f.write(report_content)
            
        print(f"✅ Success: Data report written to {REPORT_FILE_PATH}")

    except Exception as e:
        print(f"❌ Error writing report: {e}")

