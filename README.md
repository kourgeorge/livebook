<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/18VxII44vfYzWcc1L04CDfp3YAY0-3z6J

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure your LLM provider in `.env.local`:
   
   **For Gemini:**
   ```
   API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash  # Optional, defaults to gemini-2.5-flash
   LLM_PROVIDER=gemini
   ```
   
   **For Azure OpenAI (default):**
   ```
   AZURE_ENDPOINT=https://your-resource.openai.azure.com/
   AZURE_API_KEY=your_azure_api_key
   AZURE_DEPLOYMENT_NAME=gpt-4o  # Your Azure deployment name/model
   LLM_PROVIDER=azure
   ```
   
   Note: You can use either Gemini or Azure OpenAI. Set `LLM_PROVIDER` to `gemini` or `azure` to choose. The model name is configured via `AZURE_DEPLOYMENT_NAME` for Azure or `GEMINI_MODEL` for Gemini.
3. Run the app:
   `npm run dev`
