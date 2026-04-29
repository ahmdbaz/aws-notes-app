import json
import boto3
import hmac
import hashlib
import base64

CLIENT_ID = 'onn0l5qs4rekjnhmglbj5l3s4'
CLIENT_SECRET = 'client-secret-code (not telling you for security :)'

def get_secret_hash(username):
    message = username + CLIENT_ID
    dig = hmac.new(
        CLIENT_SECRET.encode('utf-8'),
        msg=message.encode('utf-8'),
        digestmod=hashlib.sha256
    ).digest()
    return base64.b64encode(dig).decode()

client = boto3.client('cognito-idp', region_name='eu-central-1')

def lambda_handler(event, context):
    body = json.loads(event['body'])
    email = body['email']
    code = body['code']
    
    try:
        client.confirm_sign_up(
            ClientId=CLIENT_ID,
            SecretHash=get_secret_hash(email),
            Username=email,
            ConfirmationCode=code
        )
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Email verified successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }