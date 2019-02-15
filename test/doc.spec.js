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
    document.select( 3, 'end' );
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
    document.select( 2 );
    expect( document.selectedRange().save()).toEqual([]);

});



