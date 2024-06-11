# Limitations of the Qdrant connector

* Offset currently only works when document ID's are Integers, and will not work if String ID's are used.
* Currently, queries are generated using collections which engine auto-generates the types for, it might be better to dynamically generate prodecures/commands since this database doesn't fully comply with the NDC spec.