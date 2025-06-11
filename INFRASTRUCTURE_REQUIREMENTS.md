# Infrastructure Requirements for Lambda VPC Connectivity

## Issue Summary
The Lambda function `brightboost-teacher-signup-feat-teacher-signup-mvp-fn` is deployed successfully but cannot access AWS Secrets Manager due to VPC connectivity limitations. The function times out after 30 seconds while attempting to fetch database credentials.

## Root Cause
- **VPC Route Table**: Route table `rtb-064ed06e6fbf3ba46` has route `0.0.0.0/0 → None` (missing internet gateway)
- **No VPC Endpoints**: No VPC endpoints exist for AWS Secrets Manager in VPC `vpc-073101147d08101dc`
- **Lambda Isolation**: Lambda functions in VPC subnets cannot reach AWS services without proper routing

## Required Infrastructure Changes

### Option 1: VPC Endpoint (Recommended)
Create a VPC endpoint for Secrets Manager to enable private connectivity:

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-073101147d08101dc \
  --service-name com.amazonaws.us-east-1.secretsmanager \
  --route-table-ids rtb-064ed06e6fbf3ba46 \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": "*",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": "*"
      }
    ]
  }'
```

### Option 2: Internet Gateway Route
Add internet gateway route to enable outbound internet access:

```bash
# First, identify the internet gateway
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=vpc-073101147d08101dc" \
  --query 'InternetGateways[0].InternetGatewayId' --output text)

# Add route to internet gateway
aws ec2 create-route \
  --route-table-id rtb-064ed06e6fbf3ba46 \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID
```

## Current Status
- ✅ Lambda function deployed successfully
- ✅ IAM permissions configured correctly with wildcard suffix
- ✅ No merge conflicts in PR #127
- ❌ VPC connectivity prevents Secrets Manager access
- ❌ API endpoint non-functional due to Lambda timeouts

## Next Steps
1. Implement one of the VPC connectivity solutions above
2. Test Lambda function after infrastructure changes
3. Verify API endpoint returns HTTP 201 responses
4. Document successful deployment in PR #127

## API Details
- **Endpoint**: `https://your-api-gateway-url.execute-api.region.amazonaws.com/stage/api/signup/teacher`
- **Stack**: `brightboost-teacher-signup-feat-teacher-signup-mvp`
- **Lambda Role**: `brightboost-teacher-signu-TeacherSignupFunctionRole-NX81foP6ZBFk`
- **Secret ARN**: `arn:aws:secretsmanager:us-east-1:012876801822:secret:brightboost/aurora/prod-A7vWnk*`
