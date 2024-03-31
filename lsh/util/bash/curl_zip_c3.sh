# Check if exactly one argument is given
if [ "$#" -ne 1 ]; then
	echo "Usage: $0 <zip_path>"
	echo "Usage: $1 <hosting_cluster>"
	echo "Usage: $2 <environment>"
	echo "Usage: $3 <s3_path>"
	echo "Usage: $4 <auth_token>"
	exit 1
fi

curl -v -H "Content-Type: application/zip" -X PUT -T $0 https://$1/$2/genaisearch/file/$3 -H 'Authorization:$4'

curl -v -H "Content-Type: application/zip" -X PUT -T ./data.zip https://gkev8dev.c3dev.cloud/lefv20231117/gurusearch/file/gcs://c3--gkev8dev/cornea/unstructured/docs/ -H 'Authorization:REDACTED'

