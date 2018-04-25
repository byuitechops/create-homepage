const request = require('request');
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
        // /* GitHub URL to byui-design-lti home page template */
        // https.get('https://raw.githubusercontent.com/byuitechops/byui-design-lti/master/views/homePage.ejs', (res) => {

        //     /* When we receive the homepage template, send it on */
        //     res.on('data', (d) => {
        //         course.message('Retrieved Homepage Template');
        //         callback(null, d.toString());
        //     });

        // }).on('error', (err) => {
        //     callback(err, null);
        // });

        request('https://raw.githubusercontent.com/byuitechops/byui-design-lti/master/views/homePage.ejs', (err, res, body) => {
            if (err) {
                callback(err);
                return;
            }
            course.message('Retrieved Homepage Template');
            callback(null, body);
        });
    }

    /* Update the template using course information */
    function updateTemplate(template, callback) {

        /* Replace things easily identified with regex */
        template = template.replace(/<%=\s*courseName\s*%>/gi, course.info.courseCode);
        template = template.replace(/<%=\s*courseClass\s*%>/gi, course.info.courseCode.replace(/\s/g, ''));
        template = template.replace(/\[Lorem.*\]/gi, '[Course Description goes here]');

        var $ = cheerio.load(template);

        /* Add the generate class */
        $('.lessons').addClass('generate');

        /* Add the homeImage src */
        $('img').attr('src', `https://${course.info.domain}.instructure.com/courses/${course.info.canvasOU}/file_contents/course%20files/template/homeImage.jpg`);

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

    var validPlatforms = ['online', 'pathway'];
    if (!validPlatforms.includes(course.settings.platform)) {
        course.message('Invalid platform. Skipping child module');
        stepCallback(null, course);
        return;
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