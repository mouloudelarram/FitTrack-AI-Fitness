# AWS Setup Guide — FitTrack MVP

Complete step-by-step guide to deploy the FitTrack backend on AWS Free Tier.

---

## Prerequisites

- AWS Account (free tier)
- Node.js 18+ installed
- Python 3.10+ installed
- Git installed

---

## STEP 1 — Install Required Tools

### Install AWS CLI
```bash
# macOS (Homebrew)
brew install awscli

# Linux
pip install awscli --user

# Windows (PowerShell as Administrator)
pip install awscli
```

### Install Serverless Framework
```bash
npm install -g serverless
npm install -g serverless-python-requirements
```

### Verify installations
```bash
aws --version
serverless --version
node --version
python3 --version
```

---

## STEP 2 — Configure AWS Credentials

### Create an IAM user (recommended over root credentials)
1. Go to AWS Console → IAM → Users → Create User
2. Username: `fittrack-deployer`
3. Permissions: Attach **AdministratorAccess** (for initial setup)
4. Create Access Key → CLI usage → Copy keys

### Configure AWS CLI
```bash
aws configure
```
Enter when prompted:
```
AWS Access Key ID: YOUR_ACCESS_KEY_ID
AWS Secret Access Key: YOUR_SECRET_ACCESS_KEY
Default region name: us-east-1
Default output format: json
```

### Verify configuration
```bash
aws sts get-caller-identity
```

---

## STEP 3 — Deploy Backend with Serverless

### Install Python dependencies for packaging
```bash
cd fitness-tracker-mvp/backend
pip install -r requirements.txt --break-system-packages
npm install
```

### Install serverless-python-requirements plugin
```bash
npm install --save-dev serverless-python-requirements
```

### Deploy to AWS
```bash
serverless deploy --stage dev --region us-east-1
```

This will:
- Create all Lambda functions
- Set up API Gateway
- Create DynamoDB tables (users, food-logs, weight-logs)
- Create S3 bucket for food images
- Create Cognito User Pool
- Configure all IAM roles

### Expected output:
```
✔ Service deployed to stack fitness-tracker-mvp-dev

endpoints:
  GET  - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/profile
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/profile
  PUT  - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/profile
  GET  - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/food-logs
  POST - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/food-logs
  ...

Stack Outputs:
  UserPoolId: us-east-1_XXXXXXXXX
  UserPoolClientId: XXXXXXXXXXXXXXXXXXXXXXXXXX
  ApiGatewayUrl: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
```

---

## STEP 4 — Save Important Values

After deploy, save these values — you'll need them for the Flutter app:

```
API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_APP_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Get values manually if needed:
```bash
# Get Cognito User Pool ID
aws cognito-idp list-user-pools --max-results 10

# Get User Pool Client ID
aws cognito-idp list-user-pool-clients --user-pool-id us-east-1_XXXXXXXXX

# Get API Gateway URL
aws apigateway get-rest-apis
```

---

## STEP 5 — Verify DynamoDB Tables

```bash
# List all tables
aws dynamodb list-tables

# Verify users table
aws dynamodb describe-table --table-name fitness-tracker-mvp-users-dev

# Verify food-logs table
aws dynamodb describe-table --table-name fitness-tracker-mvp-food-logs-dev

# Verify weight-logs table
aws dynamodb describe-table --table-name fitness-tracker-mvp-weight-logs-dev
```

### If you need to create tables manually:

#### Users Table
```bash
aws dynamodb create-table \
  --table-name fitness-tracker-mvp-users-dev \
  --attribute-definitions AttributeName=user_id,AttributeType=S \
  --key-schema AttributeName=user_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### Food Logs Table
```bash
aws dynamodb create-table \
  --table-name fitness-tracker-mvp-food-logs-dev \
  --attribute-definitions \
    AttributeName=log_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
    AttributeName=date,AttributeType=S \
  --key-schema AttributeName=log_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "user_id-date-index",
      "KeySchema": [
        {"AttributeName": "user_id", "KeyType": "HASH"},
        {"AttributeName": "date", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'
```

#### Weight Logs Table
```bash
aws dynamodb create-table \
  --table-name fitness-tracker-mvp-weight-logs-dev \
  --attribute-definitions \
    AttributeName=log_id,AttributeType=S \
    AttributeName=user_id,AttributeType=S \
    AttributeName=date,AttributeType=S \
  --key-schema AttributeName=log_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {
      "IndexName": "user_id-date-index",
      "KeySchema": [
        {"AttributeName": "user_id", "KeyType": "HASH"},
        {"AttributeName": "date", "KeyType": "RANGE"}
      ],
      "Projection": {"ProjectionType": "ALL"}
    }
  ]'
```

---

## STEP 6 — Verify S3 Bucket

```bash
# List buckets
aws s3 ls

# Verify the food images bucket exists
aws s3api head-bucket --bucket fitness-tracker-mvp-food-images-dev
```

### If creating manually:
```bash
aws s3api create-bucket \
  --bucket fitness-tracker-mvp-food-images-dev \
  --region us-east-1

# Block all public access
aws s3api put-public-access-block \
  --bucket fitness-tracker-mvp-food-images-dev \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Add CORS configuration
aws s3api put-bucket-cors \
  --bucket fitness-tracker-mvp-food-images-dev \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'
```

---

## STEP 7 — Test the API

### Test the dashboard endpoint (requires a valid Cognito token):
```bash
# First get a token (after creating a test user in Cognito)
TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id YOUR_CLIENT_ID \
  --auth-parameters USERNAME=test@example.com,PASSWORD=TestPass123 \
  --query 'AuthenticationResult.AccessToken' \
  --output text)

# Test the dashboard endpoint
curl -H "Authorization: Bearer $TOKEN" \
  "https://YOUR_API_URL/dev/dashboard?date=$(date +%Y-%m-%d)"
```

---

## STEP 8 — Monitor with CloudWatch

```bash
# View Lambda logs
aws logs get-log-events \
  --log-group-name /aws/lambda/fitness-tracker-mvp-dev-getDailyCalories \
  --log-stream-name $(aws logs describe-log-streams \
    --log-group-name /aws/lambda/fitness-tracker-mvp-dev-getDailyCalories \
    --query 'logStreams[-1].logStreamName' \
    --output text)
```

---

## STEP 9 — Remove / Tear Down

To remove all deployed resources:
```bash
cd backend
serverless remove --stage dev
```

---

## AWS Free Tier Limits (FYI)

| Service | Free Tier Limit |
|---------|----------------|
| Lambda | 1M requests/month, 400,000 GB-seconds |
| DynamoDB | 25 GB storage, 25 RCU/WCU |
| S3 | 5 GB storage, 20K GET, 2K PUT |
| API Gateway | 1M API calls/month |
| Cognito | 50,000 MAU |
| CloudWatch | 5 GB logs/month |

This MVP is well within free tier limits for development and testing.

---

## Troubleshooting

### "Serverless: No service detected" error
Make sure you're in the `backend/` directory.

### Lambda timeout errors
The default timeout is 30 seconds. DynamoDB cold starts are fast — if you hit timeouts, check your VPC configuration.

### CORS errors in app
The serverless.yml already configures CORS for all endpoints. If you still see CORS errors, deploy again: `serverless deploy`.

### DynamoDB ProvisionedThroughputExceededException
The tables use `PAY_PER_REQUEST` billing — this shouldn't happen. Check your table configuration.
