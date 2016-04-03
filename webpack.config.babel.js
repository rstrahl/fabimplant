import webpack from 'webpack';
import ProgressBarPlugin from 'progress-bar-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

const ENV = process.env.NODE_ENV || 'development';
const CSS_MAPS = ENV !== 'production';

module.exports = {
	context:	`${__dirname}/src`,
	entry:		'./index.js',

	output: {
		path:		`${__dirname}/build`,
		publicPath:	'/',
		filename:	'bundle.js'
	},

	module: {

		loaders: [
			{
				test:		/\.jsx?$/,
				include:	`${__dirname}/src/`,
				loader:		'babel'
			},
			{
				test: /\.(less|css)$/,
				// include: /src\//,
				loader: ExtractTextPlugin.extract('style', [
					`css?sourceMap=${CSS_MAPS}&modules&importLoaders=1&localIdentName=[local]${process.env.CSS_MODULES_IDENT || '_[hash:base64:5]'}`,
					// 'postcss',
					`less?sourceMap=${CSS_MAPS}`
				].join('!'))
			},
			{
				test: /\.(xml|html|txt|md)$/,
				exclude: [/src\/index\.html$/],
				loader: 'raw'
			}
		]
	},

	plugins: ([
		new ProgressBarPlugin(),
		new webpack.NoErrorsPlugin(),
		new ExtractTextPlugin('style.css', {
			allChunks: false,		// leave async chunks using style-loader
			disable: ENV!=='production'
		}),
		new webpack.DefinePlugin({
			process: {},
			'process.env': {},
			'process.env.NODE_ENV': JSON.stringify(ENV)
			// process: JSON.stringify({ env:{ NODE_ENV: ENV } })
		}),
		new HtmlWebpackPlugin({
			template: './index.html',
			minify: { collapseWhitespace: true },
			title: 'FabImplant'
		})
	]).concat(ENV==='production' ? [
		new webpack.optimize.DedupePlugin(),
		new webpack.optimize.OccurenceOrderPlugin(),
		new webpack.optimize.UglifyJsPlugin({
			mangle: true,
			compress: { warnings: false },
			output: { comments:false }
		})
	] : []),

	devServer: {
		port: process.env.PORT || 8080,
		host: '0.0.0.0',
		publicPath: '/',
		quiet: false,
		contentBase: `${__dirname}/src`,
		historyApiFallback: true
	}

};
