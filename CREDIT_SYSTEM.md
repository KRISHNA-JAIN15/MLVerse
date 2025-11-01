# MLVerse Credit/Token System Documentation

## Overview
The MLVerse platform now implements a comprehensive credit/token system that allows model owners to monetize their ML models and API users to consume models based on a pay-per-use model.

## How It Works

### 1. Model Upload with Pricing
When uploading a model, users can now specify:
- **Pricing Type**: "free" or "paid"
- **Credits Per Call**: Number of credits required per API call (only for paid models)

### 2. Credit Flow
- **Free Models**: No credits are deducted from users
- **Paid Models**: 
  - Credits are deducted from the API user's account
  - Same amount of credits are added to the model owner's account
  - If API user doesn't have enough credits, the request is rejected

### 3. API Authentication
- All prediction requests must include an API key in the `X-Api-Key` header
- The system validates the API key and retrieves the associated user account

## API Endpoints

### Model Upload (Updated)
```
POST /api/models/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- model: <file>
- name: string
- description: string
- modelType: string
- framework: string
- inputs: JSON string
- outputType: string
- pricingType: "free" | "paid"
- creditsPerCall: number (required if pricingType is "paid")
```

### Model Prediction (New)
```
POST /api/predict/{modelId}/predict
Content-Type: application/json
X-Api-Key: <user_api_key>

Body: {
  "input_field_1": value,
  "input_field_2": value,
  ...
}

Response: {
  "success": true,
  "prediction": {
    "result": <prediction_result>,
    "confidence": 0.85,
    "modelInfo": {...}
  },
  "creditsUsed": 5,
  "remainingCredits": 45
}
```

### Get Model Info
```
GET /api/predict/{modelId}/info

Response: {
  "success": true,
  "model": {
    "modelId": "uuid",
    "name": "Model Name",
    "description": "Description",
    "pricingType": "paid",
    "creditsPerCall": 5,
    "inputs": [...],
    "outputType": "classification"
  }
}
```

### Get User Credits
```
GET /auth/credits
Authorization: Bearer <token>

Response: {
  "success": true,
  "credits": 100
}
```

## Error Handling

### Insufficient Credits
```
Status: 402 Payment Required
{
  "success": false,
  "error": "Insufficient credits",
  "required": 5,
  "available": 2
}
```

### Invalid API Key
```
Status: 401 Unauthorized
{
  "success": false,
  "error": "Invalid API Key"
}
```

### Missing API Key
```
Status: 401 Unauthorized
{
  "success": false,
  "error": "API Key required. Send in X-Api-Key header"
}
```

## Database Schema Updates

### Users Table
The users table should include:
- `credits` (INT): Current credit balance
- `api_key` (VARCHAR): Unique API key for authentication

### Models Table (DynamoDB)
The MLModels table now includes:
- `pricingType` (String): "free" or "paid"
- `creditsPerCall` (Number): Credits required per API call

## Credit Management Functions

### userOperations.js
New functions added:
- `deductCredits(userId, amount)`: Deduct credits from user
- `addCreditsToOwner(ownerId, amount)`: Add credits to model owner
- `getUserByApiKey(apiKey)`: Get user by API key

## Security Considerations

1. **API Key Protection**: API keys should be kept secure and not exposed in client-side code
2. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
3. **Credit Validation**: All credit operations use database transactions to prevent race conditions
4. **Audit Trail**: Consider logging all credit transactions for audit purposes

## Usage Examples

### JavaScript Client
```javascript
// Get model info
const modelInfo = await fetch('/api/predict/model-uuid/info');

// Make prediction
const prediction = await fetch('/api/predict/model-uuid/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    feature1: 1.5,
    feature2: 'category_a',
    feature3: [1, 2, 3]
  })
});
```

### Python Client
```python
import requests

# Model prediction
response = requests.post(
    'http://localhost:6003/api/predict/model-uuid/predict',
    headers={
        'Content-Type': 'application/json',
        'X-Api-Key': 'your-api-key-here'
    },
    json={
        'feature1': 1.5,
        'feature2': 'category_a',
        'feature3': [1, 2, 3]
    }
)

result = response.json()
print(f"Prediction: {result['prediction']['result']}")
print(f"Credits used: {result['creditsUsed']}")
print(f"Remaining credits: {result['remainingCredits']}")
```

## Future Enhancements

1. **Credit Packages**: Allow users to purchase credit packages
2. **Usage Analytics**: Provide detailed usage analytics for model owners
3. **Revenue Sharing**: Implement platform commission system
4. **Subscription Models**: Allow monthly/yearly subscription options
5. **Credit Expiry**: Implement credit expiration policies