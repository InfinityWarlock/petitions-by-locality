# petitions-by-locality

This is a WIP project.

## How to install me

1. Download (ie `$ git clone`). 
2. Install dependencies (`$ npm i`)
3. For the AI bits, create a `.env` file: 
    - GEMINI_API_KEY - your API key 
    - GEMINI_MODEL_CODE - the code for the model you want to use 
    - GEMINI_RATE_LIMIT - a rate limit you want to use. This is per minute. 
4. Run `$ npm fetch-data` to fetch the data and associate petitions with topics. 
  - TODO: at the moment, this does not cache topics, so you will need to do this manually by creating SAVED_topics_by_petition.json - this is to be fixedASAP. 
5.  Run `$npm start` and navigate to `localhost:3000`. 

## TODOs:
- Weight constituencies by population, not 1/650 (population might be population or registered voters)
- Implelement proper topics caching manually

## Acknowledgements / licences for data used

### Petitions data
Contains public sector information licensed under the Open Government Licence v3.0.

### List of topics assigned to petitions 

The list is manually pulled from [the topics page of the House of Commons Library](https://commonslibrary.parliament.uk/research/full-topic-list/). Two topics are removed: monthly economic indicators and economic indicators. 

Contains Parliamentary information licensed under the [Open Parliament Licence v3.0](https://www.parliament.uk/site-information/copyright-parliament/open-parliament-licence/). 

## Screenshots

![image](https://github.com/user-attachments/assets/a3a05bcc-ad04-4170-9b8c-1b933c560a9e)
Overview view 

![image](https://github.com/user-attachments/assets/0845ab4b-e8d8-4dc7-8ba6-103b344ee10b)
Detailed view 

## What is "salience"?

The measure for salience (which should definitely be updated if anyone knows a better one for this data!) works by calculating the ratio between (signatures in a constituency / all signatures) : (1/650). This assumes that each constituency has the same population. That way, if more than `1/650 * total signatures` people in your constituency have signed a petition, it is probably *more salient* in your local area than nationally. This is very much a WIP and rough measure.

