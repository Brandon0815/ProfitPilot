# Hugging Face API Setup

## To Enable AI Insights:

1. **Get your API key:**
   - Go to https://huggingface.co/settings/tokens
   - Create a new token with "Read" permissions
   - Copy the token (starts with `hf_`)

2. **Set up the API key (Choose one method):**

   **Method 1: Environment Variable (Recommended)**
   ```bash
   # Windows PowerShell
   $env:HUGGINGFACE_API_KEY="your_api_key_here"
   
   # Windows Command Prompt
   set HUGGINGFACE_API_KEY=your_api_key_here
   
   # Linux/Mac
   export HUGGINGFACE_API_KEY="your_api_key_here"
   ```

   **Method 2: Create .env file**
   ```
   # Create a file named .env in the project root
   HUGGINGFACE_API_KEY=your_api_key_here
   ```

3. **Restart the Flask server:**
   ```bash
   python script.py
   ```

## How it Works:

- **With API Key**: Real AI analysis of your business data
- **Without API Key**: Fallback to static insights (still functional)
- **API Errors**: Graceful fallback to ensure app keeps working

## Security:

- ✅ API key is read from environment variables
- ✅ No API keys committed to repository
- ✅ Graceful fallback if API is unavailable
- ✅ Error handling for API failures

Your ProfitPilot app will work with or without the API key!
