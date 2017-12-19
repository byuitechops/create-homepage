/*eslint-env node, es6*/

/* Dependencies */
const tap = require('tap');

function g1Tests(course, callback) {
    
    var changes = course.report.find(report => report.name === 'create-homepage').changes;

    tap.equal(changes[0], 'Retrieved Homepage template.');
    tap.equal(changes[1], 'Found and inserted course banner into Homepage.');
    tap.equal(changes[2], 'Course Homepage successfully created with the template.');
    tap.equal(changes[3], 'Course Default View set to the Front Page.');

    callback(null, course);
}

module.exports = [
        {
            gauntlet: 1,
            tests: g1Tests
        }
];
