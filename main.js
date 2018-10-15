const request = require('request');
const canvas = require('canvas-wrapper');
const asyncLib = require('async');
const cheerio = require('cheerio');

let templates = {
    'Basic': 550180, // basic
    'Basic Details': 550181, // basic-details
    'Lg Ends Details': 550198 // large-ends-details
    'Lg Ends Plain': 'large-ends-plain',
    'Modules': 'modules',
    'Other': 'modules',
    'Full Pictures': 550201, // picture-buttons-full-example
    'Schedule': 550199, // detail-template-schedule
    'Small Pictures': 'picture-buttons-small-example',
    'Sm Weeks Auto': 'weeks-auto-small',
    'Syllabus': 'syllabus',
    'Weeks Auto': 'weeks-auto-large'
};

let tabs = ['other', 'modules', 'syllabus'];


module.exports = (course, stepCallback) => {
    // TESTING - remove for prod
    course.settings.platform = 'campus';
    course.info.data.campusTemplate = 'Syllabus';

    /* Get the template from equella */
    function getTemplate(callback) {
        if (course.settings.platform === 'campus') {
            if (!tabs.includes(course.info.data.campusTemplate.toLowerCase())) {

                // Campus courses have more than 1 template to choose from. The template will be chosen on startup and be stored on the course object.
                // The templates are stored here: https://byui.instructure.com/courses/16631/pages. Use the canvas-wrapper to get the correct template.

                canvas.get(`/api/v1/courses/16631/pages/${templates[course.info.data.campusTemplate]}`, (err, page) => {
                    if (err) {
                        callback(err);
                        return;
                    }
                    course.message(`Retrieved ${course.info.data.campusTemplate} Template`);
                    callback(null, page[0].body);
                });
            } else {
                // Set the homepage to be either the syllabus or modules tab
                canvas.put(`/api/v1/courses/${course.info.canvasOU}`, {
                    'course[default_view]': templates[course.info.data.campusTemplate]
                }, (err, canvasCourse) => {
                    if (err) {
                        stepCallback(err, course);
                        return;
                    }
                    course.message(`"${templates[course.info.data.campusTemplate]}" set as the Front Page`);
                    stepCallback(null, course);
                });
            }
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
        var $;
        if (course.settings.platform !== 'campus') {
            // Online
            template = template.replace(/<%=\s*courseName\s*%>/gi, course.info.courseCode);
            template = template.replace(/<%=\s*courseClass\s*%>/gi, course.info.courseCode.replace(/\s/g, '').toLowerCase());
            template = template.replace(/Additional\sResources/gi, 'Student Resources');

            /* Add the generate class */
            $ = cheerio.load(template);
            $('.lessons').addClass('generate'); // does this work?

            /* Add the homeImage src */
            $('img').attr('src', `https://${course.info.data.domain}.instructure.com/courses/${course.info.canvasOU}/file_contents/course%20files/template/homeImage.jpg`);

            template = $.html();

        } else {
            // Campus
            // Add edits to the template here
        }
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
                course.message(`Course Homepage successfully created with the ${course.info.data.campusTemplate} template`);
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
                course.message(`"${course.info.data.campusTemplate}" template set as the Front Page`);
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


    asyncLib.waterfall(functions, (err, result) => {
        // The homepage will be a wiki page
        /* Waterfall our functions so we can keep it all organized */
        if (err) {
            course.error(err);
            stepCallback(null, course);
        } else {
            stepCallback(null, course);
        }
    });
};