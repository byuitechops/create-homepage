# Create Homepage
### *Package Name*: create-homepage
### *Child Type*: Post import
### *Platform*: Online, Campus
### *Required*: Required

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose
This child module creates a page with the Homepage template, then sets it as the course's homepage. It also updates the information in the template with the course's information.

## How to Install

```
npm install create-homepage
```

## Run Requirements
This child module uses the following URL as the course homepage
https://raw.githubusercontent.com/byuitechops/byui-design-lti/master/views/homePage.ejs

This child module requires the following fields in the course.info object:
* `canvasOU`
* `courseCode`
* `domain`

## Options
None

## Outputs
None

## Process
1. GET the homepage template
2. Clean & fill the template
3. Create the page in Canvas
4. Set the new page as the homepage

## Log Categories
This module does not use course.log anywhere.


## Requirements
Use the provided homepage template to create & set the homepage.