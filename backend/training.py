# 1. Import the library
from inference_sdk import InferenceHTTPClient

import os
from dotenv import load_dotenv

load_dotenv()

# 2. Connect to your workspace
client = InferenceHTTPClient(
  api_url="https://serverless.roboflow.com",
  api_key=os.getenv("ROBOFLOW_API_KEY")
)

# 3. Run your workflow on an image
result = client.run_workflow(
  workspace_name="jason-tran",
  workflow_id="general-segmentation-api-2",
  images={
    "image": "example2.jpg"  # Path to your image file
  },
  parameters={
    "classes": "jab, cross, hook"
  },
  use_cache=True  # cache workflow definition for 15 minutes
)

# 4. Get your results
print(print(result[0]["predictions"]["predictions"]))