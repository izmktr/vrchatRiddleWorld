# Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a web scraping project with Firebase integration and web display functionality.

## Project Structure
- **scraper.py**: Main web scraping script using requests and BeautifulSoup
- **firebase_config.py**: Firebase configuration and database operations
- **web/**: Frontend files for displaying scraped data
- **config/**: Configuration files

## Key Technologies
- Python for web scraping (requests, BeautifulSoup4, selenium if needed)
- Firebase Firestore for data storage
- HTML/CSS/JavaScript for web frontend
- Firebase Web SDK for frontend data access

## Code Style Guidelines
- Use async/await for Firebase operations when possible
- Include proper error handling for web scraping
- Follow PEP 8 for Python code
- Use modern JavaScript (ES6+) for frontend
- Include logging for debugging scraping operations

## Security Notes
- Keep Firebase credentials in environment variables
- Use Firebase security rules for data access control
- Implement rate limiting for web scraping to be respectful to target sites
