var htmlParser = require('../src/html');

    [
        { 
            html: '<span style="color:red">hi</span>',
            result: [{ color: 'red', font: 'sans-serif', size: 10, text: 'hi' }],
        },
        { 
            html: '<span style="color:blue; font-size:13pt" >hi</span><span style="color:red">there</span>',
            result: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', size: 10, text: 'there' },
            ],
        },
        { 
            html: '<span style="color:blue; font-size:13pt" >hi</span><span style="color:red"><del>there</del></span>',
            result: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', strikeout: true, size: 10, text: 'there' },
            ],
        }
    ].forEach(( data, i ) => {
        test('parse function should parse html to carota format '+ i, () => {
            expect( htmlParser.parse( data.html )).toEqual( data.result );
        });
    });


    [
        { 
            run: [{ color: 'red', font: 'sans-serif', size: 10, text: 'hi' }],
            result: '<span style="color: red; font-family: sans-serif; font-size: 10pt;">hi</span>',
        },
        { 
            run: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', size: 10, text: 'there' },
            ],
            result: '<span style="color: blue; font-family: sans-serif; font-size: 13pt;">hi</span><span style="color: red; font-family: sans-serif; font-size: 10pt;">there</span>',
        },
        { 
            run: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', strikeout: true, size: 10, text: 'there' },
            ],
            result: '<span style="color: blue; font-family: sans-serif; font-size: 13pt;">hi</span><span style="color: red; font-family: sans-serif; font-size: 10pt;"><del>there</del></span>',
        },
        { 
            run: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', strikeout: false, size: 10, text: 'there' },
            ],
            result: '<span style="color: blue; font-family: sans-serif; font-size: 13pt;">hi</span><span style="color: red; font-family: sans-serif; font-size: 10pt;">there</span>',
        },
        { 
            run: [
                { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
                { color: 'red', font: 'sans-serif', strikeout: true, underline: true, size: 10, text: 'there' },
            ],
            result: '<span style="color: blue; font-family: sans-serif; font-size: 13pt;">hi</span><span style="color: red; font-family: sans-serif; text-decoration: underline; font-size: 10pt;"><del>there</del></span>',
        }
    ].forEach(( data, i ) => {
        test('html function should parse carota format to html  '+ i, () => {
            expect( htmlParser.html( data.run )).toEqual( data.result );
        });
    })


