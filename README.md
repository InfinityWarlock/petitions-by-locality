# petitions-by-locality

This is a WIP project.

## How to install me

1. Download (ie `$ git clone`). 
2. Install dependencies (`$ npm i`)
3. For the AI bits, create a `.env` file: 
    - GEMINI_API_KEY - your API key 
    - GEMINI_MODEL_CODE - the code for the model you want to use 
    - GEMINI_RATE_LIMIT - a rate limit you want to use. This is per minute. 
4. In the root of the repository, run `$ scripts/fetch_data.js` to fetch the data.
    - This should be run on a chron job / regular basis to keep the data updated. I suggest this is better than doing direct requests from every time to keep the load on the Parliament site down. 
5.  Run `$node app.js` and navigate to `localhost:3000`. 

## TODOs:
- Complete AI topics functionality, using BES topics
- Weight constituencies by population, not 1/650 (population might be population or registered voters)

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

## Old Readme 

## Getting the data
 - A (paginated) list of all petitions in JSON format can be found here: https://petition.parliament.uk/petitions.json?page=1 . We may want to limit this to only petitions with a Government response in which case we can use the `state=with_response` flag: https://petition.parliament.uk/petitions.json?page=1&state=with_response
 - Data for each petition (including signatures by constituency) can be found at e.g. https://petition.parliament.uk/petitions/657717.json
 - A list of constituencies can be found at https://petition.parliament.uk/constituencies.json
 - There is an visualisation of where petitioners are from for each constituency but as far as I can tell no way of finding the top petitions by constituency: https://petitionmap.unboxedconsulting.com/?petition=657717&area=uk - this is done! 


## Plan (Very WIP)
 - Build an ETL pipeline. If/When we get to a production stage, we can run this on a set cadence.
 - Download the data for each petition - DONE
 - Transform it to be stored by constituency. For each consituency, we want each row/object to contain something like the following: - SORT OF DONE
   - Petition id
   - Petition name
   - Signature count
   - Percentage of total signatures for that petition
 - Build a pretty frontend to display this - not currently pretty
