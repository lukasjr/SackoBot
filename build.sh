#!/bin/bash

#if [ "$#" -ne 1 ]; then
#  echo "Usage : ./build.sh lambdaName";
#  exit 1;
#fi

#lambda=${1%/}; // # Removes trailing slashes
lambda=SackoBot
region=us-east-1
echo "Deploying $lambda";
#cd $lambda;
#if [ $? -eq 0 ]; then
#  echo "...."
#else
#  echo "Couldn't cd to directory $lambda. You may have mis-spelled the lambda/directory name";
#  exit 1
#fi

#echo "nmp installing...";
#npm install
#if [ $? -eq 0 ]; then
#  echo "done";
#else 
#  echo "npm install failed";
#  exit 1;
#fi

echo "Checking that aws-cli is installed"
which aws
if [ $? -eq 0 ]; then
  echo "aws-cli is installed, continuing..."
else
  echo "You need aws-cli to deploy this lambda. Google 'aws-cli install'"
  exit 1
fi

echo "removing old zip"
rm archive.zip;

echo "creating a new zip file"
zip archive.zip *  -r -x .git/\* \*.sh tests/\* node_modules/\* \*.zip .eslintrc.json package-lock.json package.json post_request.txt

echo "Uploading $lambda to $region";

aws lambda update-function-code --function-name $lambda --zip-file fileb://archive.zip --publish

if [ $? -eq 0 ]; then
  echo "!! Upload successful !!"
else 
  echo "Upload failed"
  echo "If the error was a 400, check that there are no slashes in your lambda name"
  echo "Lambda name = $lambda"
  exit 1;
fi