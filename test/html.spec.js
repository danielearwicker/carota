var defaultStyles = {
    size: 10,
    font: 'lt_regular',
    color: 'black',
    bold: true,
    italic: false,
    underline: false,
    strikeout: false,
    align: 'left',
    script: 'normal',
};

var htmlParser = require('../src/html');

    [
        { 
            html: '<span style="color:red">hi</span>',
            result: [{
                text: 'hi',
                size: 10,
                font: 'lt_regular',
                color: 'red',
                bold: true,
                italic: false,
                underline: false,
                strikeout: false,
                align: 'left',
                script: 'normal',
            }],
        },
        { 
            html: '<span style="color:blue; font-size:13pt" >hi</span><span style="color:red">there</span>',
            result: [
                {
                    text: 'hi',
                    size: 13,
                    font: 'lt_regular',
                    color: 'blue',
                    bold: true,
                    italic: false,
                    underline: false,
                    strikeout: false,
                    align: 'left',
                    script: 'normal',
                },
                {
                    text: 'there',
                    size: 10,
                    font: 'lt_regular',
                    color: 'red',
                    bold: true,
                    italic: false,
                    underline: false,
                    strikeout: false,
                    align: 'left',
                    script: 'normal',
                }
            ],
        },
        { 
            html: '<span style="color:blue; font-size:13pt" >hi</span><span style="color:red"><del>there</del></span>',
            result: [
                {
                    text: 'hi',
                    size: 13,
                    font: 'lt_regular',
                    color: 'blue',
                    bold: true,
                    italic: false,
                    underline: false,
                    strikeout: false,
                    align: 'left',
                    script: 'normal',
                },
                {
                    text: 'there',
                    size: 10,
                    font: 'lt_regular',
                    color: 'red',
                    bold: true,
                    italic: false,
                    underline: false,
                    strikeout: true,
                    align: 'left',
                    script: 'normal',
                }
            ],
        }
    ].forEach(( data, i ) => {
        test('parse function should parse html to carota format '+ i, () => {
            expect( htmlParser.parse( data.html, defaultStyles )).toEqual( data.result );
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
        },
        { 
            run: [{ color: 'red', font: 'sans-serif', align: 'left', text: 'hi' }],
            result: '<span style="color: red; font-family: sans-serif; text-align: left;">hi</span>',
        },
        { 
            run: [{ font: 'sans-serif', align: 'right', text: 'hi\nfrom\nCarota\n!!!!\n\n\n' }],
            result: '<span style="font-family: sans-serif; text-align: right;">hi<br/>from<br/>Carota<br/>!!!!<br/><br/><br/></span>',
        },
        { 
            run: [{ font: 'sans-serif', align: 'right', text: '<x></x><span></span><><>/</><div>hi</div>' }],
            result: '<span style=\"font-family: sans-serif; text-align: right;\">&lt;x&gt;&lt;/x&gt;&lt;span&gt;&lt;/span&gt;&lt;&gt;&lt;&gt;/&lt;/&gt;&lt;div&gt;hi&lt;/div&gt;</span>',
        },
    ].forEach(( data, i ) => {
        test('html function should parse carota format to html  '+ i, () => {
            expect( htmlParser.html( data.run )).toEqual( data.result );
        });
    })


