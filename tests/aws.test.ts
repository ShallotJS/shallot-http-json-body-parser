import type { ShallotMiddleware } from 'shallot/dist/aws/core';
import type { Context, Handler, APIGatewayEvent } from 'aws-lambda';

import { test, describe, jest, expect } from '@jest/globals';

import { ShallotAWS } from 'shallot';
import { ShallotAWSHttpJsonBodyParser } from '../src';

describe('AWS JSON Body Parser Middleware', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: '',
    functionVersion: '',
    invokedFunctionArn: '',
    memoryLimitInMB: '',
    awsRequestId: '',
    logGroupName: '',
    logStreamName: '',
    getRemainingTimeInMillis: () => 0,
    done: () => undefined,
    fail: () => undefined,
    succeed: () => undefined,
  };
  const sampleBody = { hello: 'world' };

  const mockHandler: Handler<APIGatewayEvent, APIGatewayEvent> = async (event) => event;

  test('Valid JSON body', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotAWSHttpJsonBodyParser());

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Lowercase content-type', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotAWSHttpJsonBodyParser());

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'content-type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Missing content-type header', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotAWSHttpJsonBodyParser());

    const mockEventNoHeader = ({
      body: JSON.stringify(sampleBody),
      headers: {},
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());
    expect(res.body).toEqual(mockEventNoHeader.body);
  });

  test('Invalid event body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onErrorMiddleware: ShallotMiddleware<APIGatewayEvent, any> = {
      onError: jest.fn(),
    };
    const wrappedHandler = ShallotAWS(mockHandler)
      .use(ShallotAWSHttpJsonBodyParser())
      .use(onErrorMiddleware);

    const mockEventNoHeader = ({
      body: 'this is not json',
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());

    expect(onErrorMiddleware.onError).toHaveBeenCalled();
  });

  test('Null event body', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onErrorMiddleware: ShallotMiddleware<APIGatewayEvent, any> = {
      onError: jest.fn(),
    };
    const wrappedHandler = ShallotAWS(mockHandler)
      .use(ShallotAWSHttpJsonBodyParser())
      .use(onErrorMiddleware);

    const mockEventNoHeader = ({
      body: null,
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    await wrappedHandler(mockEventNoHeader, mockContext, jest.fn());

    expect(onErrorMiddleware.onError).toHaveBeenCalled();
  });

  test('Base64 encoded body', async () => {
    const wrappedHandler = ShallotAWS(mockHandler).use(ShallotAWSHttpJsonBodyParser());

    const mockEvent = ({
      isBase64Encoded: true,
      body: Buffer.from(JSON.stringify(sampleBody)).toString('base64'),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual(sampleBody);
  });

  test('Custom reviver', async () => {
    const reviver = (_: unknown, v: unknown) => (typeof v === 'string' ? 'test' : v);
    const wrappedHandler = ShallotAWS(mockHandler).use(
      ShallotAWSHttpJsonBodyParser({
        reviver,
      })
    );

    const mockEvent = ({
      body: JSON.stringify(sampleBody),
      headers: {
        'Content-Type': 'application/json',
      },
    } as unknown) as APIGatewayEvent;
    const res = await wrappedHandler(mockEvent, mockContext, jest.fn());

    expect(res.body).toEqual({ hello: reviver('', '') });
  });
});
