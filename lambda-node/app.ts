import { APIGatewayEvent, Context, Callback } from 'aws-lambda';
import { generate } from 'shortid';
import { connectToDB, success, redirect, notFound } from './lib';
import { MongoClient, Db } from 'mongodb';

const DB_NAME = process.env.DB_NAME as string;

let client: MongoClient;

export async function gethandler(event: APIGatewayEvent, context: Context, callback: Callback) {
    try {
        client = await connectToDB();
        const db = client.db(DB_NAME);
        const id = event.pathParameters!['id'];
        const dbItem = await db.collection('urls').findOne({shortId: id});
        if(!dbItem) {
            return callback(null, notFound({}));
        }
        return callback(null, redirect(dbItem.url));
    } catch(err) {
        console.error(err);
        return callback('Internal error');
    } finally {
        await client.close();
    }
}

export async function sethandler(event: APIGatewayEvent, context: Context, callback: Callback){
  try {
      client = await connectToDB();
      const db = client.db(DB_NAME);
      const body = JSON.parse(event.body as string);
      const shortId = generate();
      await db.collection('urls').insertOne({
          url: body.url,
          createdAt: new Date().toUTCString(),
          shortId,
          requesterIP: event.requestContext.identity.sourceIp
      });
      const baseURL = `https://${event.requestContext.domainName}${event.requestContext.path}`;
      callback(null, success({shortUrl: `${baseURL}/${shortId}`}));
  } catch(err) {
      console.error(err);
      callback('Internal error');
  } finally {
      await client.close();
  }
}
