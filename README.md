# data-colon
Encode and decode data: URIs on the command line using [strong-data-uri](https://github.com/strongloop/strong-data-uri).

## Installation

    npm install -g data-colon

## Usage:

    data-colon [options] [fileOrURI...]

      Options:

        -h, --help              output usage information
        -V, --version           output the version number
        -o, --output <file>     Output file name [stdout]
        -m, --mediatype <type>  MIME media type for encoding

## Examples

decode:

    data-colon data:application/octet-stream;base64,Zm9vCg==
    echo 'data:application/octet-stream;base64,Zm9vCg==' | data-colon -o foo

encode:

    data-colon data-colon image.jpg
    echo foo | data-colon -m text/plain
