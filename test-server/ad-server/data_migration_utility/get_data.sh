download() {
	#Get function args
	folder=$1
	url=$2
	inputFile=$3
	
	#Wipe the folder where results will be saved
	echo "Deleting $folder/*..."
	rm $folder/*
	
	echo "Downloading new files..."
	while read value; do
		#replace "VALUE" in the url with the value read from the input file
		urlWithValueReplaced=${url//VALUE/$value}
		
		#Curl the url, replace any IP Addresses (with optional port) and store the result in a variable.
		curlResult=$(curl $urlWithValueReplaced --silent | sed "s/[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}[:0-9]*/HTTP_HOST/g")
		
		#Attempt to pass the resulting json through jq to prettify it and dump it to a file.
		#If that doesn't work, just dump the results to the file.
		#Note: this should work even if jq is not installed, but this has not been tested.
		(echo $curlResult | jq || echo $curlResult) > $folder/$value.json
	done <$inputFile
}

download "../config" "http://127.0.0.1:8080/test-server/ad-server/config.php?appid=VALUE&make=apple&model=iphone&os=iOS&osv=10.0&sdkversion=1.0" "app_ids.txt"
download "../request" "http://127.0.0.1:8080/test-server/ad-server/request.php?zid=VALUE&make=apple&model=iphone&os=iOS&osv=10.0&adid=1234&sdkversion=1.0" "zone_ids.txt"
