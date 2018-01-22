/*eslint-env node, es6*/

/* Module Description */
// Creates a homepage in the course, but does not populate it

/* Put dependencies here */
const https = require('https');
const canvas = require('canvas-wrapper');
const asyncLib = require('async');
const cheerio = require('cheerio');
const he = require('he');

module.exports = (course, stepCallback) => {
    course.addModuleReport('create-homepage');

    /* Get the template from equella */
    function getTemplate(callback) {
        https.get('https://content.byui.edu/file/a397b063-c8bd-4e86-87a3-04a6ac57b49c/$/home.html', (res) => {

            /* When we receive the homepage template, send it on */
            res.on('data', (d) => {
                course.success('create-homepage', 'Retrieved Homepage template.');
                callback(null, d.toString());
            });

        }).on('error', (err) => {
            callback(err, null);
        });
    }

    /* Update the template using course information */
    function updateTemplate(template, callback) {

        /* Put the course name into place */
        template = template.replace(/\[Course Name\]/gi, course.info.fileName.split('.zip')[0]);

        /* Get the Large Banner */
        canvas.get(`/api/v1/courses/${course.info.canvasOU}/files?search_term=largeBanner.jpg`, (err, banner) => {
            /* Put the course banner into place - THIS WILL CHANGE EVENTUALLY */
            if (banner.length > 0) {
                template = template.replace(/img src=".*"/gi,
                    `img src="https://byui.instructure.com/courses/${course.info.canvasOU}/files/${banner[0].id}/preview"`);
                course.success('create-homepage', 'Found and inserted course banner into Homepage.');
            } else {
                course.throwWarning('create-homepage', 'Unable to find a largeBanner.jpg in the course.');
            }
            /* Put the course description instruction bit into the template */
            template = template.replace(/\[Lorem.*\]/gi, `[Course Description goes here]`);
            /* Send back the updated template */
            callback(null, template);
        });

    }

    /* Create the Front Page */
    function createFrontPage(template, callback) {
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/front_page`, {
                'wiki_page[title]': course.info.fileName.split('.zip')[0],
                'wiki_page[body]': template,
                'wiki_page[editing_roles]': 'teachers',
                'wiki_page[published]': true
            },
            (err, page) => {
                if (err) callback(err, page);
                else {
                    course.success('create-homepage', 'Course Homepage successfully created with the template.');
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
                    course.success('create-homepage', 'Course Default View set to the Front Page.');
                    callback(null, canvasCourse);
                }
            });
    }
    /* The functions to run for this module */
    var functions = [
        getTemplate,
        updateTemplate,
        createFrontPage,
        updateHomepage
    ];

    /* Waterfall our functions so we can keep it all organized */
    asyncLib.waterfall(functions, (err, result) => {
        if (err) {
            course.throwErr('create-homepage', err);
            stepCallback(null, course);
        } else {
            stepCallback(null, course);
        }
    });
};