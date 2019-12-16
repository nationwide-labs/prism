# Prism
What is Prism? A framework that leverages the Microsoft bot framework to accelerate chatbot development. Prism dynamically generates dialogue flows, schedule tasks and CLI styled commands based on content originated by the [Prism IDE](https://github.com/nationwide-labs/prism-ide). Prism uses an open source node-NLP library to make intent recognition simpler and provides the feature to use external NLPs with very little coding.

Prism is currently used to prototype chatbots internally. We are continuing to enhance Prism and developing a unit test suit. Please use it as you see fit. We'd love to have you participate in enhancing the asset and help develop unit test cases for Prism!

-	Low code
-	Easy to publish
-	Scheduler for running tasks at a specified time

## Using Prism

Currently the prism library is not in npm so if you wish to make changes to it and build your own implementation you will have to install from a tgz.
After cloning this repo you can run `npm pack` which will create a `prism-${version}.tgz` from your implementation project, you can run `npm i ${prism-location}/prism-${version}.tgz`

## Prism Bot directory layout
    .
    ├── package.json
    ├── prism-bot                   # Common folder containing prism-bot structure
    ├──── data.json                 # File containing prism-bot configuration
    ├──── main.js                   # Optional file to run when the bot starts
    ├──── interceptor.js            # Optional file to run between all received messages
    ├──── intents                   # Folder containing intents
    ├────── intent-x                # Folder containing intent-x data
    ├──────── data.json             # File containting intent-x configuration
    ├──────── code                  # Folder containing code relevant to the intent-x
    ├────────── node-x-before.js    # Code to be ran before node-x
    ├────────── node-y-after.js     # Code to be ran before node-y
    ├────── intent-y                # Folder containing intent-y data
    ├──────── data.json             # File containting intent-y configuration
    ├──────── code                  # Folder containing code relevant to the intent-y
    ├────────── node-a-before.js    # Code to be ran before node-a
    ├────────── node-a-after.js     # Code to be ran after node-a
    ├──── tasks                     # Folder containing tasks
    ├────── task-x                  # Tools and utilities
    ├──────── data.json             # Folder containing task-x data
    ├──────── code.js               # Code to be ran when the task is executed
    ├──── commands                  # Folder containing commands
    ├────── command-x               # Folder containing intent-x data
    ├──────── data.json             # File containting command-x configuration
    ├──────── code.js               # Code to be ran when the command is executed
    └── README.md

### Bot

`prism-bot/data.json`

| Field                 | Type      | Description                                                             |
|-----------------------|-----------|-------------------------------------------------------------------------|
| speakSlow             | `boolean` | If true, the bot will type at a rate based on the length of the message |
| isMainEnabled         | `boolean` | Whether the bot should load in `main.js`                                |
| isInterceptorEnabled  | `boolean` | Whether to intercept all messages or not                                |
| isIntentsEnabled      | `boolean` | Whether to use intents                                                  |
| isUtterancesEnabled   | `boolean` | Whether to use utterances within intents                                |
| isCommandsEnabled     | `boolean` | Whether to use commands                                                 |
| isCommandsHelpEnabled | `boolean` | Whether commands should use the default `!help` command                 |
| commandPrefix         | `string`  | The prefix for all commands, i.e. `!`                                   |
| isTasksEnabled        | `boolean` | Whether to use tasks                                                    |
| defaultIntentId       | `string`  | Id of the intent to use if the bot doesn't know how to respond          |
| triggerOnJoinIntentId | `string`  | Id of the intent to use when the user joins the conversation            |

### Interceptor Code Example

``` javascript
console.log('Intercepted!');

if (session.message.text == 'chicken') {
    await send('chicken is great!');
    return reject(); // prevents the bot from processing this message
} else if (session.message.text == 'bacon') {
    await send('bacon is great!');
    session.endConversation(); // cancels existing conversation
    return reject(); // prevents the bot from processing this message
}
return resolve(); // allows the bot to see the message and to attempt processing it further

```
### Main Code Example
This code is ran once after the bot has been inialized.
``` javascript
console.log('Main!');

const express = require('express');
const app = express();
const port = 9443;

app.get('/', (req, res) => {
    res.send('Hello!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}!`);
});
```

#### Main Code Variable
| variable     | purpose                                                                     |
|--------------|-----------------------------------------------------------------------------|
| intentDialog | See Microsoft Bot Builder 3.7.0                                             |
| universalBot | See Microsoft Bot Builder 3.7.0                                             |
| commander    | If you want to add more advanced commands using the `bot-commander` library |
| cwd          | The directory of `prism-bot`                                                |
| recognizer   | You can do more advance nlp traing using the `node-nlp` library             |

### Intent

`prism-bot/intents/${name}/data.json`

| Field      | Type          | Description                       |
|------------|---------------|-----------------------------------|
| id         | `string`      | Identification for the intent     |
| name       | `string`      | Name of the intent                |
| isEnabled  | `boolean`     | Whether the intent should be used |
| triggers   | `Trigger[]`   | Array of triggers to use,         |
| utterances | `Utterance[]` | Array of utteranecs to use,       |
| nodes      | `Node[]`      | Array of nodes to use             |

### Intent 🡢 Trigger
Triggers are regular expressions to force an intent to run

| Field | Type     | Description                                     |
|-------|----------|-------------------------------------------------|
| id    | `string` | Identification for the trigger                  |
| name  | `string` | Regular expression for the trigger. i.e. `quit` |

### Intent 🡢 Utterance
Utterances are used to train the `node-nlp` library for determinging the intent to use

| Field | Type     | Description                                       |
|-------|----------|---------------------------------------------------|
| id    | `string` | Identification for the Utterance                  |
| name  | `string` | Value for the utterance. i.e. `How are you today` |

### Intent 🡢 Node
Nodes are used for determining the conversational flow

| Field               | Type       | Description                                                                                                                                                                    |
|---------------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id                  | `string`   | Identification for the Node                                                                                                                                                    |
| type                | `string`   | The Node Type ie. `start` or `input.date` See below for more options.                                                                                                          |
| variable            | `string`   | Used to store the input value. This is basically the same as calling `setVariable('key', 'value');` and the variable can be accessed later via `var x = getVariable('key');`   |
| defaultNodeId       | `string`   | The next node to run unless specified otherwise in the on after/on before code                                                                                                 |
| text                | `string`   | The text to ask/say unless changed within the `on before code`                                                                                                                 |
| referenceIntentId   | `string`   | Value for the utterance. i.e. `How are you today`                                                                                                                              |
| states              | `State[]`  | Array of states to use.                                                                                                                                                        |
| answers             | `Answer[]` | Array of answers to use                                                                                                                                                        |
| codeBeforeFile      | `string`   | Code file to run before the node runs. This is referred to as `on before code`. This is relative to the `prism-bot/intents/intent/${name}/code` folder. ie. `node-x-before.js` |
| codeAfterFile       | `string`   | Code file to run after the node runs. This is referred to as `on after code`. This is relative to the `prism-bot/intents/intent/${name}/code` folder. ie. `node-x-after.js`    |
| isCodeBeforeEnabled | `boolean`  | Whether to use `on before code`                                                                                                                                                |
| isCodeAfterEnabled  | `boolean`  | Whether to use `on after code`                                                                                                                                                 |

### Intent 🡢 Node 🡢 type
Node Types

| Type                  | value                  | Description                                      |
|-----------------------|------------------------|--------------------------------------------------|
| Start                 | `start`                | The entry point of a conversation                |
| Plan                  | `plain`                | Useful for just running code                     |
| Reference             | `reference`            | Moves to another intent                          |
| Input Date            | `input.date`           | Gets a date value from the user                  |
| Input Multiple Choice | `input.multipleChoice` | Makes the user answer a multiple choice question |
| Input Number          | `input.number`         | Retrieves a number from the user.                |
| Input Text            | `input.text`           | Retrieves text from the user.                    |
| Input Yes/No          | `input.yesNo`          | Forces the user to answer a question             |
| Output Text           | `output.text`          | Sends text to the user                           |

### Intent 🡢 Node 🡢 Answer
Node Answer

| Field      | Type     | Description                                                            |
|------------|----------|------------------------------------------------------------------------|
| id         | `string` | Identification for the Answer                                          |
| name       | `string` | Display value of the answer                                            |
| nextNodeId | `string` | Node to run if this answer is chosen                                   |
| order      | `number` | How to order the answers, otherwise they will be sorted alphabetically |

### Intent 🡢 Node 🡢 State
Node State

| Field      | Type     | Description                                                                                                                         |
|------------|----------|-------------------------------------------------------------------------------------------------------------------------------------|
| id         | `string` | Identification for the State                                                                                                        |
| name       | `string` | name of the state, this can be used in `on before code` or `on after code` by using `resolve('stateName')` or `reject('stateName')` |
| nextNodeId | `string` | Node to run if this state is chosen                                                                                                 |

### Intent 🡢 Node 🡢 `on before code` + `on after code`
These functions are wrapped in the `vm` library and called using `runInNewContext`. As such, the code is wrapped in an asynchronous function declarataion so you can call `await` and run your call linearly without additional setup.

``` diff
- Make sure to call resolve() or reject() within any on after or on before code, otherwise the bot will not be able to move on.
- Also make sure to only call resolve or reject once within your code, otherwise strange things might happen.
```

| Function                                          | Description                                                                                                                                                                                                                                                           |
|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `reject()`                                        | Ends the conversation and calls `session.endDialog()`                                                                                                                                                                                                                 |
| `setVariable(name:string, value:any)`             | Set a variable about the user with a conversation context                                                                                                                                                                                                             |
| `getVariable(name:string)`                        | Get a variable about the user with a conversation context                                                                                                                                                                                                             |
| `setConversationVariable(name:string, value:any)` | Set a variable about the conversation without a user context                                                                                                                                                                                                          |
| `getConversationVariable(name:string)`            | Get a variable about the conversation without a user context                                                                                                                                                                                                          |
| `setUserVariable(name:string, value:any)`         | Set a variable about the user without a conversation context                                                                                                                                                                                                          |
| `getUserVariable(name:string)`                    | Get a variable about the user without a conversation context                                                                                                                                                                                                          |
| `send(value:any)`                                 | Sends an object or string to the user. If you wish to time messages, this function returns a promise so be sure to use `.then` or an `await`                                                                                                                          |
| `email(value:any)`                                | Built in function to email somebody using [nodemailer](https://nodemailer.com/about/) assuming you can talk directly to a mail relay. This can be set with `process.env.MAIL_HOST` or you can override the transporter with `PrismUtil.setMailTransport(transporter)` |
| `promiseGet`                                      | Helper function for turning a `request.get` into a promise                                                                                                                                                                                                            |
| `promisePost`                                     | Helper function for turning a `request.post` into a promise                                                                                                                                                                                                           |

| Variable | Description                                                                                                                          |
|----------|--------------------------------------------------------------------------------------------------------------------------------------|
| session  | See [Microsoft Bot Builder Session 3.7.0](https://docs.microsoft.com/en-us/javascript/api/botbuilder/session?view=botbuilder-ts-3.0) |
| userData | The object representing what we remembered about the user equivalent to session.userData                                             |
| builder  | Reference to `require('botbuilder')`                                                                                                 |

### Intent 🡢 Node 🡢 `on before code`
| Function                     | Description                                                                 |
|------------------------------|-----------------------------------------------------------------------------|
| `resolve(stateName?:string)` | Moves on to the next node. `stateName` can be used to direct the next node. |

For an input node, you can `resolve()` or `resolve(stateName/answerName)` and declare `skip = true;` to skip the input portion of a question.
For an input node, you can dynamically set the prompt using `prompt = 'This is a question';`
For an input node of type multipleChoice, you can dynamically set the answers by using `results = ['red', 'blue', 'green'];`

### Intent 🡢 Node 🡢 `on after code`
| Function                     | Description                                                                                            |
|------------------------------|--------------------------------------------------------------------------------------------------------|
| `resolve(stateName?:string)` | Moves on to the run portion of a node.                                                                 |
| `getResponse()`              | Used for Input nodes in the on after portion. This lets you get the value without declaring a variable |

#### Send Example

``` javascript
await send('Hello, lovely weather we are having!');
await send('this is a really really really really really really really really really really really really really really really long message.');
await send('well then');
return resolve();
```

#### Email Example

``` javascript
await email({
    from: '"John Doe" <john.doe@mail.com>',
    to: 'jane.doe@mail.com',
    subject: 'Hello',
    text: 'Hello world?',
    html: '<b>Hello world?</b>'
});

await send('Email was sent!');

return resolve();
```

#### Set Variable Example

``` javascript
setVariable('food', 'bacon');
return resolve();
```

#### Get Variable Example

``` javascript
var x = getVariable('food');
send('Food:' + x);
return resolve();
```

#### Get Response Example

``` javascript
// On After of an input node
var answer = getResponse();
console.log(answer);
return resolve();
```

#### promiseGet Example
The raw flag will return the actual response with error, response, and body objects. otherwise it is always just the body.

``` javascript
let response = await promiseGet({
    url: 'https://some made up url/api/resource',
    json: true
}).catch(()=>{});
console.log(response);
// { "id" : "pretend-id" }

let response = await promiseGet({
    url: 'https://some made up url/api/resource',
    json: true,
    raw: true
}).catch(()=>{});
console.log(response);
// { error : OBJECT, response : OBJECT, body : OBJECT }
```

#### promisePost Example
``` javascript
let response = await promiseGet({
    url: 'https://some made up url/api/resource',
    json: true,
    body: {
        data: {
            id: '123'
        }
    }
}).catch(()=>{});
console.log(response);
// { "id" : "pretend-id" }
```

### Command

This functionality extends the node library [bot-commander](https://www.npmjs.com/package/bot-commander)

If you wish to use more advanced commands, you can initialize then in the `main.js` file by referencing the variable `commander`.

`prism-bot/commands/${name}/data.json`

| Field         | Type       | Description                                                                  |
|---------------|------------|------------------------------------------------------------------------------|
| id            | `string`   | Identification for the command                                               |
| name          | `string`   | Name of the command                                                          |
| description   | `string`   | Description to show up when the user types   `!help`                         |
| isEnabled     | `boolean`  | Whether the command should be enabled                                        |
| isHelpEnabled | `boolean`  | Whether the command should show up when the user types `!help`               |
| options       | `Option[]` | Array of options to use                                                      |
| codeFile      | `string`   | Name of the code file relative to `prism-bot/commands/${name}` ie. `code.js` |

### Command 🡢 Option
Option are regular expressions to force an intent to run

| Field        | Type     | Description                                                                 |
|--------------|----------|-----------------------------------------------------------------------------|
| id           | `string` | Identification for the option                                               |
| flags        | `string` | Check out `Option parsing` within `bot-commander` ie. `-c, --cheese [type]` |
| description  | `string` | Description to show up when the user types `!help`                          |
| defaultValue | `string` | Value to use for a flag if the user does not specify otherwise              |

### Command 🡢 `code`

This code has access to the same variables and funtion as the `on before code` and `on after code` with the exception that you do not have to call `resolve` or `reject`

Code Example
```javascript
send('You just ran me!');
```

### Task

This functionality extends the node library [node-schedule](https://www.npmjs.com/package/node-schedule)

`prism-bot/tasks/${name}/data.json`

| Field     | Type      | Description                                                                      |
|-----------|-----------|----------------------------------------------------------------------------------|
| id        | `string`  | Identification for the task                                                      |
| name      | `string`  | Name of the task                                                                 |
| schedule  | `string`  | This field uses Cron-style Scheduling. ie `*/5 * * * *` will run every 5 minutes |
| isEnabled | `boolean` | Whether the command should be enabled                                            |
| codeFile  | `string`  | Name of the code file relative to `prism-bot/tasks/${name}` ie. `code.js`        |

### Task 🡢 `code`

This code is not tied to a users session although you do get access to the `universalBot` and `intentDialog` objects so you could load the users session and do some more complicated logic.

Code Example
```javascript
console.log('task was ran');
```

### Loading a users session when not in the session
```javascript
let address = {
    channelId: 'rocket',
    user: {
        id: 'some-user-id' 
    },
    conversation: {
        id: 'some-conversation-id'
    }
};

universalBot.loadSession(address, (err, session) => {
    session.send('This long task finally finished!');
});
```

### User

In the code that has a session, ie. `on before code`, `on after code` and `commands` you can access the user id via `session.message.address.user.id`.

You can also access the user value by just calling `user` from within the code. 

If you want to access the raw user object, do so by `session.message.address.user`

``` javascript
var userId = session.message.address.user.id; // some-id
var userId2 = user.id; // some-id
```

If Active Directory is enabled, you also get access to the whole user object from active directory via `session.message.address.user.ad`

Note that the user variable in the session code has been replaced with the active directory user instead of the channel user.

``` javascript
var userCN = session.message.address.user.ad.cn; // doeJohn
var userCN = session.message.address.user.id; // some-id
var userCN2 = user.cn; // doeJohn
var userId = user.id; // undefined
```

Sample AD User Object

``` javascript
 {
     dn: '...',
     cn: '...',
     sn: '...',
     postOfficeBox: '...',
     telephoneNumber: '...',
     givenName: '...',
     distinguishedName: '...',
     displayName: '...',
     memberOf: [
         '...',
         '...'
     ],
     department: '...', 
     displayNamePrintable: '...', 
     name: '...', 
     '...': '...'
 }
``` 

# Prism Development

`npm i` installs the dependencies locally
`npm dev` runs a live reloading bot that lives in `examples/server/index.ts` using `ts-node-dev`
