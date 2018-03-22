/*eslint-env node, es6*/

/* Module Description */
/* Creates a homepage in the course, but does not populate it */

const https = require('https');
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

module.exports = (course, stepCallback) => {

    /* The functions to run for this module */
    var functions = [
        getTemplate,
        updateTemplate,
        createFrontPage,
        updateHomepage
    ];

    /* Get the template from equella */
    function getTemplate(callback) {
        // UNOFFICIAL EQUELLA URL: https://content.byui.edu/file/a397b063-c8bd-4e86-87a3-04a6ac57b49c/$/home.html
        /* GitHub URL to byui-design-lti home page template */
        https.get('https://raw.githubusercontent.com/byuitechops/byui-design-lti/master/views/homePage.ejs', (res) => {

            /* When we receive the homepage template, send it on */
            res.on('data', (d) => {
                course.message('Retrieved Homepage Template');
                callback(null, d.toString());
            });

        }).on('error', (err) => {
            callback(err, null);
        });
    }

    /* Update the template using course information */
    function updateTemplate(template, callback) {

        /* Put the course name into place */
        template = template.replace(/<%=\s*courseName\s*%>/gi, course.info.courseName);
        template = template.replace(/<%=\s*courseClass\s*%>/gi, course.info.courseCode.replace(/\s/g, ''));

        template = template.replace(/<div class="lessons">/, '<div class="lessons generate">');

        /* Assumes reorganize file structure has/will run. reorganize file structure DOES NOT have to run first */
        template = template.replace(/img src=".*"/gi,
            `img src="https://${course.info.domain}.instructure.com/courses/${course.info.canvasOU}/file_contents/course%20files/template/homeImage.jpg"`);
        course.message('Found and inserted course banner into Homepage');

        /* Put the course description instruction bit into the template */
        template = template.replace(/\[Lorem.*\]/gi, '[Course Description goes here]');
        /* Send back the updated template */
        callback(null, template);
    }



    /* Create the Front Page */
    function createFrontPage(template, callback) {
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/front_page`, {
            'wiki_page[title]': '-Course Homepage',
            'wiki_page[body]': template,
            'wiki_page[editing_roles]': 'teachers',
            'wiki_page[published]': true
        },
        (err, page) => {
            if (err) callback(err, page);
            else {
                course.message('Course Homepage successfully created with the template');
                callback(null, page);
            }
        });
    }

    function updateHomepage(page, callback) {
        /* This API call is not on the official docs, but here is a thread
           explaining it: https://community.canvaslms.com/thread/11645 */
        canvas.put(`/api/v1/courses/${course.info.canvasOU}`, {
            'course[default_view]': 'wiki'
        },
        (err, canvasCourse) => {
            if (err) callback(err, canvasCourse);
            else {
                course.message('Course Default View set to the Front Page');
                callback(null, canvasCourse);
            }
        });
    }

    /* Waterfall our functions so we can keep it all organized */
    asyncLib.waterfall(functions, (err, result) => {
        if (err) {
            course.error(err);
            stepCallback(null, course);
        } else {
            stepCallback(null, course);
        }
    });
};