const request = require('request');
const fs = require('fs');
const canvas = require('canvas-wrapper');
const asyncLib = require('async');
const cheerio = require('cheerio');

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
        if (course.info.platform === 'campus') {
            // Campus courses have more than 1 template to choose from. The template will be chosen on startup and be stored on the course object.
            // The templates should be stored locally, so a path to that local file will be necessary.

            // TODO: Give it the path to the correct template
            fs.readFile(`/campusTemplates/${course.info.campusTemplate}`, (err, body) => {
                if (err) {
                    callback(err);
                    return;
                }
                course.message('Retrieved Campus Homepage Template');
                callback(null, body);
            });
        } else {
            request('https://raw.githubusercontent.com/byuitechops/byui-design-lti/master/views/homePage.ejs', (err, res, body) => {
                if (err) {
                    callback(err);
                    return;
                }
                course.message('Retrieved Online Homepage Template');
                callback(null, body);
            });
        }
    }

    /* Update the template using course information */
    function updateTemplate(template, callback) {

        /* Replace things easily identified with regex */
        template = template.replace(/<%=\s*courseName\s*%>/gi, course.info.courseCode);
        template = template.replace(/<%=\s*courseClass\s*%>/gi, course.info.courseCode.replace(/\s/g, '').toLowerCase());
        template = template.replace(/\[Lorem.*\]/gi, '[Course Description goes here]');
        template = template.replace(/Additional\sResources/gi, 'Student Resources');

        var $ = cheerio.load(template);

        /* Add the generate class */
        $('.lessons').addClass('generate'); // does this work?

        /* Add the homeImage src */
        $('img').attr('src', `https://${course.info.domain}.instructure.com/courses/${course.info.canvasOU}/file_contents/course%20files/template/homeImage.jpg`);

        template = $.html();

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