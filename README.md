# Telegram Bot for SUSTech Unifound PMS

## Introduction
This is a [Telegram](https://telegram.org/) bot for SUSTech [Unifound Print Management Service (PMS)](http://pms.sustc.edu.cn/) (only accessible from campus network).

## Commands
**Get list of all print stations:** `/allstations`

**Get list of print stations containing given name:** `/stations <name>`

## Environment
- Node.js 9.0+

## Installation
```sh
npm install
```

## Configuration
Create a file config.json:
```json
{
    "tg-bot-token": "Your Telegram bot token here"
}
```

## Start
```sh
npm start
```
