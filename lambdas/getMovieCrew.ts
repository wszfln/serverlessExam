import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommandInput, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    try{
        console.log("Event: ", event);
        const parameters = event?.pathParameters;
        console.log("Paramters:", parameters)
        const movieId = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
        const crewRole = parameters?.crewRole;
        const nameParam = event?.queryStringParameters?.name;
        const name = nameParam ? parseInt(nameParam) : undefined; 


        if (!movieId || !crewRole){
            return {
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({ Message: "Missing movie Id or missing crew role name" }),
            };
        }

        let commandInput: QueryCommandInput ={
            TableName: process.env.TABLE_NAME, 
        }

        if (name){
            commandInput = {
                ...commandInput,
                KeyConditionExpression: "movieId = :m AND crewRole = :cR",
                FilterExpression: "name == :n",
                ExpressionAttributeValues: {
                    ":m": movieId,
                    ":cR": crewRole,
                    ":n": name
                },
            }
        }else{
            commandInput = {
                ...commandInput,
                KeyConditionExpression: "movieId = :m AND crewRole = :cR",
                ExpressionAttributeValues: {
                    ":m": movieId,
                    ":cR": crewRole
                },
            }
        }

        const commandOutput = await ddbDocClient.send(      
            new QueryCommand(commandInput)       
        );
        

        if(!commandOutput.Items || commandOutput.Items.length === 0){       
            return {                                                       
                statusCode: 404,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ Message: "No reviews found. Verify movie Id and crew role name and sub name and try again. Additionally, there may be no crew role name for this movie yet" }),
            };
        }

        return{
            statusCode: 200,
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({ data: commandOutput.Items }),
        };
    } catch (error: any){
        console.log(JSON.stringify(error));
            return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ error }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
  }

