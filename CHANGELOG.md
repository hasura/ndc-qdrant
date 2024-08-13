# Qdrant Connector Changelog
This changelog documents changes between release tags.

## [0.2.6] - 2024-08-13
* Fix workflow to publish to NDC-hub

## [0.2.5] - 2024-08-08
* Update SDK to v6.0.0

## [0.2.4] - 2024-08-08
* Update connector-definition versions

## [0.2.3] - 2024-08-06
* Update workflow to open a PR in ndc-hub

## [0.2.2] - 2024-08-05
* Update SDK to 5.2.0
* Pin version to 0.1.5

## [0.2.1] - 2024-05-10
* Updated error handling to throw an error when attempting to paginate across string ID's since offset only works with points with Integer ID's

## [0.2.0] - 2024-05-6
* Added support for multi-vector points

## [0.1.9] - 2024-05-6
* Add multi-arch build

## [0.1.8] - 2024-04-17
* Update SDK to 4.5.0
* Update packaging to use a Dockerized Command
* Fix generate-config to only re-write the config if the introspection results are different

## [0.1.7] - 2024-03-25
* Add handling for recommend with UUID's

## [0.1.6] - 2024-03-22
* Fix error handling
* Allow String (UUID) OR Integer IDs by introspecting the ID type.

## [0.1.5] - 2024-03-13
* Fix connector-metadata.yaml

## [0.1.4] - 2024-03-13
* Fix environment variables to set empty string to undefined
* Update connector-metadata.yaml with correct values

## [0.1.3] - 2024-03-12
* Setting up github workflow

## [0.1.2] - 2024-03-12
* Setting up github workflow

## [0.1.1] - 2024-03-12
* Setting up github workflow

## [0.1.0] - 2023-10-16
Initial release