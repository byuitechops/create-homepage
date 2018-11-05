const canvas = require('canvas-wrapper');
const asyncLib = require('async');
const cheerio = require('cheerio');

let templates = {
    'Basic': {
        'id': 550180,
        'name': 'basic'
    },
    'Basic Details': {
        'id': 926515,
        'name': 'basic-details'
    },
    'Lg Ends Details': {
        'id': 550198,
        'name': 'large-ends-details'
    },
    'Lg Ends Plain': {
        'id': 550197,
        'name': 'large-ends-plain'
    },
    'Full Pictures': {
        'id': 550201,
        'name': 'picture-buttons-full-example'
    },
    'Schedule': {
        'id': 550199,
        'name': 'detail-template-schedule'
    },
    'Small Pictures': {
        'id': 550200,
        'name': 'picture-buttons-small-example'
    },
    'Sm Weeks Auto': {
        'id': 550183,
        'name': 'weeks-auto-small'
    },
    'Weeks Auto': {
        'id': 550182,
        'name': 'weeks-auto-large'
    },
    'Modules': 'modules', // Course Modules
    'Other': 'modules', // Course Modules
    'Syllabus': 'syllabus', // Course Syllabus
};

let tabs = ['other', 'modules', 'syllabus'];

module.exports = (course, stepCallback) => {
    // TEST STUFF DELETE WHEN DONE	
    course.settings.platform = 'campus';
    course.info.data.campusTemplate = 'Small Pictures';

    /* Get the template from equella */
    function getTemplate(callback) {
        if (course.settings.platform === 'campus') {
            if (!tabs.includes(course.info.data.campusTemplate.toLowerCase())) {
                // Campus courses have more than 1 template to choose from. The template will be chosen on startup and be stored on the course object.
                // The templates are stored here: https://byui.instructure.com/courses/16631/pages. Use the canvas-wrapper to get the correct template.
                canvas.get(`/api/v1/courses/16631/pages/${templates[course.info.data.campusTemplate].id}`, (err, page) => {
                    if (err) {
                        course.warning('Unable to get campus template by ID. Attempting to get campus template by name...');
                        // An error occurred while getting the campus template by id
                        // Now try getting the campus template by name
                        canvas.get(`/api/v1/courses/16631/pages/${templates[course.info.data.campusTemplate].name}`, (err, page) => {
                            if (err) {
                                // An error occurred while getting the campus template by name
                                course.error('Failed to get campus template by name and ID.');
                                callback(err);
                                return;
                            }
                            course.message(`Retrieved ${course.info.data.campusTemplate} Template by name.`);
                            callback(null, page[0].body);
                        });
                    } else {
                        course.message(`Retrieved ${course.info.data.campusTemplate} Template by id.`);
                        callback(null, page[0].body);
                    }
                });
            } else {
                // Set the homepage to be either the syllabus or modules tab
                canvas.put(`/api/v1/courses/${course.info.canvasOU}`, {
                    'course[default_view]': templates[course.info.data.campusTemplate]
                }, (err, canvasCourse) => {
                    if (err) {
                        // An error occurred while setting the template to syllabus or modules
                        stepCallback(err, course);
                        return;
                    }
                    course.log('Front Page Template Set', {
                        'Template Used': course.info.data.campusTemplate
                    });
                    stepCallback(null, course);
                });
            }
        } else {
            // Get the online course template's homepage
            canvas.get('/api/v1/courses/1521/pages/49204', (err, page) => {
                if (err) {
                    // An error occurred while getting the OCT template
                    callback(err);
                    return;
                }
                course.message('Retrieved Online Homepage Template');
                callback(null, page[0].body);
            });
        }
    }

    /* Update the template using course information */
    function updateTemplate(template, callback) {
        /* Replace things easily identified with regex */
        var $ = cheerio.load(template);
        if (course.settings.platform !== 'campus') {
            // Online
            template = template.replace($('h2').first().text(), `Welcome to ${course.info.courseName}`);
        } else {
            // Campus
            $('img').first().attr('src', `https://byui.instructure.com/courses/${course.info.canvasOU}/file_contents/course%20files/template/homeImage.jpg`);
            template = $.html();
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
            // An error occurred while creating the front page
            if (err) callback(err, page);
            else {
                course.log('Course Homepage Created', {
                    'Template Used': course.info.data.campusTemplate
                });
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
            // An error occurred while updating the homepage
            if (err) callback(err, canvasCourse);
            else {
                course.log('Front Page Template Set', {
                    'Template Used': course.info.data.campusTemplate
                });
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