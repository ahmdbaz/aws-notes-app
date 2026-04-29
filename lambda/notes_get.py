import json
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('notes')

def lambda_handler(event, context):
    user_id = event['requestContext']['authorizer']['jwt']['claims']['sub']
    
    response = table.query(
        KeyConditionExpression=Key('userId').eq(user_id)
    )
    
    notes = response['Items']
    
    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps(notes)
    }