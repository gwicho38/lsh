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

curl -v -H "Content-Type: application/zip" -X PUT -T ./data.zip https://gkev8dev.c3dev.cloud/lefv20231117/gurusearch/file/gcs://c3--gkev8dev/cornea/unstructured/docs/ -H 'Authorization:eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzUxMiJ9.eyJhcHAiOiJna2V2OGRldi1sZWZ2MjAyMzEwMDkyMDA1LWd1cnVzZWFyY2giLCJpc3MiOiJjMy5haSIsImdyb3VwcyI6WyJDMy5BcHBBZG1pbiIsIkdlbmFpLkFkbWluVXNlciIsIkMzLkVudkFkbWluIl0sInNpZCI6MSwiYXVkIjoiYzMuYWkiLCJpZHAiOiIiLCJjM2dyb3VwcyI6WyJDMy5BcHBBZG1pbiIsIkdlbmFpLkFkbWluVXNlciIsIkMzLkVudkFkbWluIl0sImlkcGdyb3VwcyI6IntcIk9pZGNJZHBDb25maWc6OmdrZXY4ZGV2LmMzZGV2LmNsb3VkXCI6W1wiZGV2Lk9pZGNEZWZhdWx0R3JvdXBcIl19Iiwic3NpZHgiOiIiLCJuYW1lIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImlkIjoiZmM4MDQxM2IxOTY1YjAxYWIzMWYxMzEzMmFjMTk2MjhkNjQwNzRhNjUyNjQyZTJjOGQwYjE4MGE1NWZjZWM5ZiIsImV4cCI6MTcwMDE2MjM4MzAwMCwiZW1haWwiOiJsdWlzLmZlcm5hbmRlei1kZS1sYS12YXJhQGMzLmFpIn0.2HrUrfcivlGQEw4rNuG6oPiIj8hKX_BM2PR0C1tyO18sZSsi7e-YfkrcwZL-SxIQ6zzgtFvyextnwd8O7LMqA2y2kEd3_6BujkqK89-1cJbyQ8VTzXFy7gXtkr3gjYWcimoR5fNYQ2xYGnBwv_7rdgQrXS7RYZZNNa6GIt7qy_TZO8WHlRaJPg8qXhw4aiiSsRQd7kKa86OkSJH7fnAEj3aCW5po8OiM7lI7_uc_41xZnLMqpRvY2EXdWg36lgQOAqwdBS2D5yIXaKpDaD_AStHjeX8LGhvPhRTUSppA_3n5Y81j-hF3OcoYNTL2KFkzPqe2Fa9S5rBD4r1jiJD4Dg'

