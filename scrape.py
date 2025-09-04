# Library
from bs4 import BeautifulSoup as Soup
import pandas as pd
import requests
from pandas import DataFrame
import json
import re

from urllib.parse import urlparse, parse_qs

df = DataFrame()  # Empty DataFrame

# Conference mapping
conference_map = {
    # SEC
    'Texas': 'SEC', 'Oklahoma': 'SEC', 'Alabama': 'SEC', 'Georgia': 'SEC', 'LSU': 'SEC',
    'Texas A&M': 'SEC', 'Florida': 'SEC', 'Tennessee': 'SEC', 'Ole Miss': 'SEC',
    'Mississippi State': 'SEC', 'Auburn': 'SEC', 'Arkansas': 'SEC', 'Kentucky': 'SEC',
    'South Carolina': 'SEC', 'Missouri': 'SEC', 'Vanderbilt': 'SEC',

    # Big Ten (with 2025 expansion: USC, UCLA, Oregon, Washington)
    'Ohio State': 'Big Ten', 'Michigan': 'Big Ten', 'Penn State': 'Big Ten',
    'Wisconsin': 'Big Ten', 'Iowa': 'Big Ten', 'Illinois': 'Big Ten', 'Indiana': 'Big Ten',
    'Michigan State': 'Big Ten', 'Minnesota': 'Big Ten', 'Northwestern': 'Big Ten',
    'Nebraska': 'Big Ten', 'Purdue': 'Big Ten', 'Maryland': 'Big Ten', 'Rutgers': 'Big Ten',
    'Oregon': 'Big Ten', 'Washington': 'Big Ten', 'USC': 'Big Ten', 'UCLA': 'Big Ten',

    # ACC (with 2025 additions: Cal, Stanford, SMU)
    'Clemson': 'ACC', 'Florida State': 'ACC', 'Miami (FL)': 'ACC',
    'North Carolina': 'ACC', 'NC State': 'ACC', 'Duke': 'ACC', 'Wake Forest': 'ACC',
    'Virginia': 'ACC', 'Virginia Tech': 'ACC', 'Louisville': 'ACC', 'Syracuse': 'ACC',
    'Boston College': 'ACC', 'Pittsburgh': 'ACC', 'Georgia Tech': 'ACC',
    'California': 'ACC', 'Stanford': 'ACC', 'SMU': 'ACC',

    # Big 12 (with 2025 lineup: Utah, Colorado, Arizona, Arizona State)
    'BYU': 'Big 12', 'Iowa State': 'Big 12', 'Kansas': 'Big 12', 'Kansas State': 'Big 12',
    'Oklahoma State': 'Big 12', 'Texas Tech': 'Big 12', 'TCU': 'Big 12', 'Baylor': 'Big 12',
    'West Virginia': 'Big 12', 'Houston': 'Big 12', 'UCF': 'Big 12', 'Cincinnati': 'Big 12',
    'Utah': 'Big 12', 'Colorado': 'Big 12', 'Arizona': 'Big 12', 'Arizona State': 'Big 12',

    # Pac-12 → dissolved after 2024, so covered by Big Ten/Big 12/ACC

    # Mountain West
    'Boise State': 'MWC', 'Fresno State': 'MWC', 'San Diego State': 'MWC',
    'Air Force': 'MWC', 'Colorado State': 'MWC', 'Utah State': 'MWC',
    'Wyoming': 'MWC', 'Hawaii': 'MWC', 'UNLV': 'MWC', 'Nevada': 'MWC',
    'San Jose State': 'MWC', 'New Mexico': 'MWC',

    # American (AAC)
    'Memphis': 'AAC', 'Tulane': 'AAC', 'UTSA': 'AAC', 'Temple': 'AAC',
    'Navy': 'AAC', 'East Carolina': 'AAC', 'USF': 'AAC', 'North Texas': 'AAC',
    'Tulsa': 'AAC', 'Charlotte': 'AAC', 'Rice': 'AAC', 'FAU': 'AAC',
    'UAB': 'AAC',

    # Conference USA (CUSA)
    'Liberty': 'CUSA', 'New Mexico State': 'CUSA', 'Sam Houston': 'CUSA',
    'FIU': 'CUSA', 'Jacksonville State': 'CUSA', 'Western Kentucky': 'CUSA',
    'Middle Tennessee': 'CUSA', 'Louisiana Tech': 'CUSA', 'UTEP': 'CUSA',

    # MAC
    'Toledo': 'MAC', 'Ohio': 'MAC', 'Miami (OH)': 'MAC', 'Buffalo': 'MAC',
    'Akron': 'MAC', 'Bowling Green': 'MAC', 'Kent State': 'MAC',
    'Ball State': 'MAC', 'Central Michigan': 'MAC', 'Eastern Michigan': 'MAC',
    'Western Michigan': 'MAC', 'Northern Illinois': 'MAC',

    # Sun Belt
    'Appalachian State': 'Sun Belt', 'Coastal Carolina': 'Sun Belt',
    'Georgia Southern': 'Sun Belt', 'Georgia State': 'Sun Belt',
    'James Madison': 'Sun Belt', 'Marshall': 'Sun Belt',
    'Old Dominion': 'Sun Belt', 'Arkansas State': 'Sun Belt',
    'Louisiana': 'Sun Belt', 'ULM': 'Sun Belt', 'South Alabama': 'Sun Belt',
    'Troy': 'Sun Belt', 'Texas State': 'Sun Belt',

    # Independents
    'Notre Dame': 'Ind', 'UConn': 'Ind', 'UMass': 'Ind'
}


# Conference champions (update based on current season)
champs = {'Texas', 'Ohio State', 'Clemson', 'BYU', 'Boise State'}

# Function to determine conference champions (first team from each conference until 5 champs)
def get_conference_champions(teams_list):
    """Get the first team from each conference until we have 5 champions"""
    seen_conferences = set()
    champions = set()
    
    # Go through teams in ranking order, mark first team from each conference as champ
    for team in teams_list:
        conf = conference_map.get(team['name'], 'Unknown')
        if conf != 'Unknown' and conf != 'Ind' and conf not in seen_conferences and len(champions) < 5:
            seen_conferences.add(conf)
            champions.add(team['name'])
    
    return champions

def create_logo_filename(team_name):
    """Convert team name to logo filename format"""
    # Handle special cases
    special_cases = {
        'Texas A&M': 'texas-am',
        'Ole Miss': 'ole-miss',
        'NC State': 'nc-state',
        'North Carolina': 'north-carolina',
        'South Carolina': 'south-carolina',
        'Arizona State': 'arizona-state',
        'Kansas State': 'kansas-state',
        'Iowa State': 'iowa-state',
        'Ohio State': 'ohio-state',
        'Penn State': 'penn-state',
        'Notre Dame': 'notre-dame',
        'Boise State': 'boise-state',
        'Virginia Tech': 'virginia-tech',
        'Georgia Tech': 'georgia-tech',
        'Wake Forest': 'wake-forest',
        'Boston College': 'boston-college',
        'Mississippi State': 'mississippi-state'
    }
    
    if team_name in special_cases:
        return special_cases[team_name]
    
    # Default conversion: lowercase, replace spaces with hyphens, remove special chars
    return re.sub(r'[^\w\s-]', '', team_name.lower().replace(' ', '-'))

# Scraping code
url = 'https://collegepolltracker.com/football/'
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
}

html = requests.get(url, headers=headers)
soup = Soup(html.text, 'html.parser')

teams = []

for team_div in soup.find_all("div", class_="teamBar")[:25]:  # Limit to first 25 teams
    rank = team_div.find("span", class_="teamRank")
    name = team_div.find("span", class_="teamName")
    logo = team_div.find("img", class_="teamLogo")
    record = team_div.find("span", class_="teamRecord")

    # Skip if any key element is missing
    if not (rank and name and logo and record):
        continue

    team_name = name.a.text.strip() if name.a else name.text.strip()
    
    teams.append({
        "rank": int(rank.text.strip()),
        "name": team_name,
        "logo": "https:" + logo["src"],
        "record": record.text.strip(),
    })

# Ensure we only have 25 teams max
teams = teams[:25]

# Determine conference champions dynamically
champs = get_conference_champions(teams)

# Transform to target format
formatted_teams = []
for team in teams:
    team_name = team["name"]
    formatted_teams.append({
        "id": team["rank"],
        "name": team_name,
        "conference": conference_map.get(team_name, "Unknown"),
        "logo": team["logo"],  # Use the scraped logo URL with "https:" prefix
        "record": team["record"],
        "champ": team_name in champs
    })

# Output as JavaScript array for direct import
js_output = "const initialRankings = " + json.dumps(formatted_teams, indent=4) + ";"

# Also save as JSON file for weekly updates
with open('rankings.json', 'w') as f:
    json.dump(formatted_teams, f, indent=4)

print("JavaScript output:")
print(js_output)
print("\nJSON file saved as 'rankings.json'")
print(f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")