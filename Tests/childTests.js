/* Dependencies */
const tap = require('tap');
const canvas = require('canvas-wrapper');

module.exports = (course, callback) => {
    tap.test('create-homepage', (test) => {

        canvas.get(`/api/v1/courses/${course.info.canvasOU}/front_page`, (err, homepageArr) => {
            if (err) {
                course.error(err);
                test.end();
                return;
            }

            var homepage = homepageArr[0];

            canvas.get(`/api/v1/courses/${course.info.canvasOU}`, (err, courseArr) => {
                if (err) {
                    course.error(err);
                    test.end();
                    return;
                }

                var canvasCourse = courseArr[0];

                test.ok(homepage, 'Homepage does not exist');
                test.ok(homepage.front_page, 'The page retrieved is not set as the home page');
                test.ok(homepage.published, 'The homepage is not published');
                test.ok(/homeImage\.jpg/.test(homepage.body), 'The homeImage isn\'t set');
                test.equal(homepage.hide_from_students, false, 'The homepage is hidden from students');
                test.equal(homepage.title, '-Course Homepage', 'The title is not set to "-Course Homepage"');
                test.equal(homepage.editing_roles, 'teachers', 'The editing roles are not set to just "teachers"');
                test.equal(canvasCourse.default_view, 'wiki', 'Default view for the course isn\'t set to the homepage');
                test.end();
            });
        });
    });

    callback(null, course);
};