# petitions-by-locality

This is a WIP project.

## Getting the data
 - A (paginated) list of all petitions in JSON format can be found here: https://petition.parliament.uk/petitions.json?page=1 . We may want to limit this to only petitions with a Government response in which case we can use the `state=with_response` flag: https://petition.parliament.uk/petitions.json?page=1&state=with_response
 - Data for each petition (including signatures by constituency) can be found at e.g. https://petition.parliament.uk/petitions/657717.json
 - A list of constituencies can be found at https://petition.parliament.uk/constituencies.json
 - There is an visualisation of where petitioners are from for each constituency but as far as I can tell no way of finding the top petitions by constituency: https://petitionmap.unboxedconsulting.com/?petition=657717&area=uk