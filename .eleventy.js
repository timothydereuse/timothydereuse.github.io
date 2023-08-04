module.exports = config => {

    config.addPassthroughCopy("src/bundle.css");
    config.addPassthroughCopy("src/randword.js");

    return {
        dir: {
            input: 'src',
            output: 'dist'
        }
    };
};