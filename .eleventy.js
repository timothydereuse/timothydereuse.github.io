module.exports = config => {

    config.addPassthroughCopy("src/bundle.css");
    config.addPassthroughCopy("src/randword.js");
    config.addPassthroughCopy("static");

    return {
        dir: {
            input: 'src',
            output: '_site'
        }
    };
};