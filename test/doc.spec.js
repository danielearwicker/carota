var doc = require('../src/doc');
var defaultStyles = {
    size: 10,
    font: 'lt_regular',
    color: 'red',
    bold: true,
    italic: false,
    underline: false,
    strikeout: false,
    align: 'left',
    script: 'normal',
};

var document = doc( defaultStyles );

document.load([
    { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
    { color: 'red', strikeout: true, size: 10, text: 'there' },
]);


test('save function should return the selected content with default styles applied for each run', () => {
    document.selectAll();
    expect( document.save()).toEqual([
        {
            text: 'hi',
            size: 13,
            font: 'sans-serif',
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
        },
    ]);
});

test('select function should take end of text if second param is `end` ', () => {
    document.selectFrom( 3 );
    expect( document.selectedRange().save()).toEqual([
        {
            text: 'here',
            size: 10,
            font: 'lt_regular',
            color: 'red',
            bold: true,
            italic: false,
            underline: false,
            strikeout: true,
            align: 'left',
            script: 'normal',
        },
    ]);

});

test('getLinksData function should extract links data', () => {
    // NOTE x, y, width, height are zero as tests are run on jsdom 
    // only checking the elements
    document.load([
        { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1' },
        { color: 'red', strikeout: true, size: 10, text: 'how', link: '' },
        { color: 'red', strikeout: true, size: 10, text: 'Areyou?', link: 'link2' },
    ]);
    expect( document.getLinksData()).toEqual([
        {
            value: 'link1',
            text: 'there',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        },
        {
            value: 'link2',
            text: 'Areyou?',
            x: 0,
            y: 0,
            width: 0,
            height: 0,
        },
    ]);

    document.load([
        { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
        { color: 'blue', font: 'sans-serif', size: 13, text: 'there' },
    ]);
    expect( document.getLinksData()).toEqual([]);
});

test('selectByProperties function should return a range', () => {
    document.load([
        { color: 'blue', font: 'sans-serif', size: 13, text: 'hi' },
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1' },
        { color: 'green', strikeout: true, size: 10, text: 'how', link: 'link1' },
        { color: 'red', strikeout: true, size: 10, text: 'Areyou?', link: 'link2' },
    ]);
    document.select( 4, 4, true ); // move caret to 4th 
    expect( document.selectByProperties([ 'link' ]).save()).toEqual([
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
        { color: 'green', strikeout: true, size: 10, text: 'how', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
    ]);
    expect( document.selectByProperties([ 'link', 'size' ]).save()).toEqual([
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
        { color: 'green', strikeout: true, size: 10, text: 'how', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
    ]);
    expect( document.selectByProperties([ 'size' ]).save()).toEqual([
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
        { color: 'green', strikeout: true, size: 10, text: 'how', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
        { color: 'red', strikeout: true, size: 10, text: 'Areyou?', link: 'link2', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
    ]);
    expect( document.selectByProperties([ 'link', 'color' ]).save()).toEqual([
        { color: 'red', strikeout: true, size: 10, text: 'there', link: 'link1', align: 'left', bold: true, font: 'lt_regular', italic: false, script: 'normal', underline: false },
    ]);
});




