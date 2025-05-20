# petitions-by-locality

This is a WIP project.

## How to use me

1. Download (ie `$ git clone`). Currently no dependencies, so no need for `$ npm i`. 
2. In the root of the repository, run: `$ node run_me.js`. 
3. Open index.html in your browser and select `data/constituencies_data.json`. This process can 100% be improved, but it does work! 

## TODOs:

- Group petitions by topic (eg immigration, NHS) automatically. My suggestion: use an LLM to pull out topics from the descriptions of the petitions. 

## Licence for the petitions data 

Contains public sector information licensed under the Open Government Licence v3.0.

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
