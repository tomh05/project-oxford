var assert = require('assert'),
    _Promise = require('bluebird'),
    uuid = require('uuid'),
    fs = require('fs'),
    oxford = require('../dist/oxford'),
    client = new oxford.Client(process.env.OXFORD_KEY);

// Store variables, no point in calling the api too often
var billFaces = [],
    personGroupId = uuid.v4(),
    personGroupId2 = uuid.v4(),
    billPersonId;
 
describe('Project Oxford Face API Test', function () {
    afterEach(function() {
        // delay after each test to prevent throttling
        var now = +new Date() + 250;
        while(now > +new Date());
    });

    describe('#detect()', function () {
        it('detects a face in a stream', function (done) {
            client.face.detect({
                stream: fs.createReadStream('./test/images/face1.jpg'),
                analyzesFaceLandmarks: true,
                analyzesAge: true,
                analyzesGender: true,
                analyzesHeadPose: true
            }).then(function (response) {
                assert.ok(response.body[0].faceId);
                assert.ok(response.body[0].faceRectangle);
                assert.ok(response.body[0].faceLandmarks);
                assert.ok(response.body[0].attributes.gender);
                assert.ok(response.body[0].attributes.headPose);

                assert.equal(response.body[0].attributes.gender, 'male');
                done();
            });
        });

        it('detects a face in a local file', function (done) {
            client.face.detect({
                path: './test/images/face1.jpg',
                analyzesFaceLandmarks: true,
                analyzesAge: true,
                analyzesGender: true,
                analyzesHeadPose: true
            }).then(function (response) {
                assert.ok(response.body[0].faceId);
                assert.ok(response.body[0].faceRectangle);
                assert.ok(response.body[0].faceLandmarks);
                assert.ok(response.body[0].attributes.gender);
                assert.ok(response.body[0].attributes.headPose);

                assert.equal(response.body[0].attributes.gender, 'male');
                done();
            });
        });

        it('detects a face in a remote file', function (done) {
            client.face.detect({
                url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Bill_Gates_June_2015.jpg',
                analyzesFaceLandmarks: true,
                analyzesAge: true,
                analyzesGender: true,
                analyzesHeadPose: true
            }).then(function (response) {
                assert.ok(response.body[0].faceId);
                assert.ok(response.body[0].faceRectangle);
                assert.ok(response.body[0].faceLandmarks);
                assert.ok(response.body[0].attributes.gender);
                assert.ok(response.body[0].attributes.headPose);

                assert.equal(response.body[0].attributes.gender, 'male');
                done();
            });
        });
    });
    
    describe('#similar()', function () {
        it('detects similar faces', function (done) {
            var detects = [];

            this.timeout(10000);

            detects.push(client.face.detect({
                path: './test/images/face1.jpg',
            }).then(function(response) {
                assert.ok(response.body[0].faceId)
                billFaces.push(response.body[0].faceId);
            }));

            detects.push(client.face.detect({
                path: './test/images/face2.jpg',
            }).then(function(response) {
                assert.ok(response.body[0].faceId)
                billFaces.push(response.body[0].faceId);
            }));

            _Promise.all(detects).then(function() {
                client.face.similar(billFaces[0], [billFaces[1]]).then(function(response) {
                    assert.ok(response.body[0].faceId)
                    done();
                });
            });
        });
    });

    describe('#grouping()', function () {
        it('detects groups faces', function (done) {
            var faceIds = [];

            this.timeout(10000);

            client.face.detect({
                path: './test/images/face-group.jpg',
            }).then(function(response) {
                response.body.forEach(function (face) {
                    faceIds.push(face.faceId);
                });

                assert.equal(faceIds.length, 6);
            }).then(function() {
                client.face.grouping(faceIds).then(function (response) {
                    assert.ok(response.body.messyGroup);
                    done();
                });
            });
        });
    });

    describe('#verify()', function () {
        it('verifies a face against another face', function (done) {
            this.timeout(10000);

            assert.equal(billFaces.length, 2);

            client.face.verify(billFaces).then(function (response) {
                assert.ok(response.body);
                assert.ok((response.body.isIdentical === true || response.body.isIdentical === false));
                assert.ok(response.body.confidence);
                done();
            });
        });
    });
    
    describe('#PersonGroup', function () {
        it('cleans up before testing', function (done) {
            this.timeout(5000);
            // Fine, you got me. This isn't really a test. In order to test the
            // training feature, we have to start trainign - sadly, we can't
            // delete the group then. So we clean up before we run tests - and to wait
            // for cleanup to finish, we're just using done().
            client.face.personGroup.list().then(function (response) {
                var promises = [];

                response.body.forEach(function (personGroup) {
                    if (personGroup.name.indexOf('po-node-test-group') > -1) {
                        promises.push(client.face.personGroup.delete(personGroup.personGroupId));
                    }
                });

                _Promise.all(promises).then(function () {
                    done();
                });
            });
        })

        it('creates a PersonGroup', function (done) {
            client.face.personGroup.create(personGroupId, 'po-node-test-group', 'test-data').then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('lists PersonGroups', function (done) {
            client.face.personGroup.list().then(function (response) {
                assert.ok(response.body);
                assert.ok((response.body.length > 0));
                assert.ok(response.body[0].personGroupId);
                done();
            });
        });

        it('gets a PersonGroup', function (done) {
            client.face.personGroup.get(personGroupId).then(function (response) {
                assert.equal(response.body.personGroupId, personGroupId);
                assert.equal(response.body.name, 'po-node-test-group');
                assert.equal(response.body.userData, 'test-data');
                done();
            });
        });
        
        it('updates a PersonGroup', function (done) {
            client.face.personGroup.update(personGroupId, 'po-node-test-group2', 'test-data2').then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('gets a PersonGroup\'s training status', function (done) {
            client.face.personGroup.trainingStatus(personGroupId).then(function (response) {
                assert.equal(response.body.code, 'PersonGroupNotTrained');
                done();
            });
        });

        it('starts a PersonGroup\'s training', function (done) {
            client.face.personGroup.trainingStart(personGroupId).then(function (response) {
                assert.equal(response.body.status, 'running');
                done();
            });
        });

        it('deletes a PersonGroup', function (done) {
            client.face.personGroup.delete(personGroupId).then(function (response) {
                assert.ok((response.statusCode === 200 || response.statusCode === 409));
                done();
            });
        });
    });

    describe('#Person', function () {
        it('creates a PersonGroup for the Person', function (done) {
            client.face.personGroup.create(personGroupId2, 'po-node-test-group', 'test-data')
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('creates a Person', function (done) {
            client.face.person.create(personGroupId2, [billFaces[0]], 'test-bill', 'test-data')
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                assert.ok(response.body.personId);
                billPersonId = response.body.personId;
                done();
            });
        });

        it('gets a Person', function (done) {
            client.face.person.get(personGroupId2, billPersonId).then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                assert.ok(response.body.personId);
                done();
            });
        });

        it('updates a Person', function (done) {
            client.face.person.update(personGroupId2, billPersonId, [billFaces[0]], 'test-bill', 'test-data')
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('adds a face to a Person', function (done) {
            client.face.person.addFace(personGroupId2, billPersonId, billFaces[1], 'test-data')
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('gets a face from a Person', function (done) {
            client.face.person.getFace(personGroupId2, billPersonId, billFaces[1])
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                assert.ok(response.body.userData);
                assert.equal(response.body.userData, 'test-data');
                done();
            });
        });

        it('updates a face on a Person', function (done) {
            client.face.person.updateFace(personGroupId2, billPersonId, billFaces[1], 'test-data')
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('deletes a face on a Person', function (done) {
            client.face.person.deleteFace(personGroupId2, billPersonId, billFaces[1])
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });

        it('lists Persons', function (done) {
            client.face.person.list(personGroupId2)
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                assert.ok(response.body[0].personId);
                done();
            });
        });

        it('deletes a Person', function (done) {
            client.face.person.delete(personGroupId2, billPersonId)
            .then(function (response) {
                assert.equal(response.statusCode, 200);
                assert.equal(response.statusMessage, 'OK');
                done();
            });
        });
    });
});

describe('Project Oxford Vision API Test', function () {
    before(function() {
        // ensure the output directory exists
        if(!fs.existsSync('./test/output')){
            fs.mkdirSync('./test/output', 0766, function(err){ 
                throw err;
            });
        }
    });

    it('analyzes a local image', function (done) {
        this.timeout(10000);
        client.vision.analyzeImage({
            path: './test/images/vision.jpg',
            ImageType: true,
            Color: true,
            Faces: true,
            Adult: true,
            Categories: true
        })
        .then(function (response) {
            assert.ok(response.body);
            assert.ok(response.body.categories);
            assert.ok(response.body.adult);
            assert.ok(response.body.metadata);
            assert.ok(response.body.faces);
            assert.ok(response.body.color);
            assert.ok(response.body.imageType);
            done();
        });
    });

    it('analyzes an online image', function (done) {
        this.timeout(10000);
        client.vision.analyzeImage({
            url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Bill_Gates_June_2015.jpg',
            ImageType: true,
            Color: true,
            Faces: true,
            Adult: true,
            Categories: true
        })
        .then(function (response) {
            assert.ok(response.body);
            assert.ok(response.body.categories);
            assert.ok(response.body.adult);
            assert.ok(response.body.metadata);
            assert.ok(response.body.faces);
            assert.ok(response.body.color);
            assert.ok(response.body.imageType);
            done();
        });
    });
    
    it('creates a thumbnail for a local image', function (done) {
        this.timeout(10000);
        client.vision.thumbnail({
            path: './test/images/vision.jpg',
            pipe: fs.createWriteStream('./test/output/thumb2.jpg'),
            width: 100,
            height: 100,
            smartCropping: true
        })
        .then(function (response) {
            var stats = fs.statSync('./test/output/thumb2.jpg');
            assert.ok((stats.size > 0));
            done();
        });
    });

    it('creates a thumbnail for an online image', function (done) {
        this.timeout(10000);
        client.vision.thumbnail({
            url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Bill_Gates_June_2015.jpg',
            pipe: fs.createWriteStream('./test/output/thumb1.jpg'),
            width: 100,
            height: 100,
            smartCropping: true
        })
        .then(function (response) {
            var stats = fs.statSync('./test/output/thumb1.jpg');
            assert.ok((stats.size > 0));
            done();
        });
    });
    
    it('runs OCR on a local image', function (done) {
        this.timeout(10000);
        client.vision.ocr({
            path: './test/images/vision.jpg',
            language: 'en',
            detectOrientation: true
        })
        .then(function (response) {
            assert.ok(response.body.language);
            assert.ok(response.body.regions);
            done();
        });
    });

    it('runs OCR on an online image', function (done) {
        this.timeout(10000);
        client.vision.ocr({
            url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Bill_Gates_June_2015.jpg',
            language: 'en',
            detectOrientation: true
        })
        .then(function (response) {
            assert.ok(response.body.language);
            assert.ok(response.body.orientation);
            done();
        });
    });
});