import { FeedController } from './feed_controller'
import { TweetVisualization } from './tweet_visualization'
import { TweetNode, TweetTree } from './tweet_tree'
import { TweetServer } from './tweet_server'
import { Toolbar } from './toolbar'
import { SerializedTweetNode } from './serialize'
import * as d3 from 'd3'

export type PointNode = d3.HierarchyPointNode<TweetNode>;

/**
 * The controller for the main tree visualization.
 */
export class VisualizationController {
    private tweetTree: TweetTree;
    private vis: TweetVisualization;
    private feed: FeedController;
    private toolbar: Toolbar;
    private server: TweetServer;

    fetchTweets(tweetId: string) {
        this.server.requestTweets(tweetId, null).then((tweetSet) => {
            let tweetTree = new TweetTree(tweetSet)
            document.getElementsByTagName('title')[0].innerText =
                `${tweetTree.root.tweet.username} - "${tweetTree.root.tweet.bodyText}" in Treeverse`

            this.setInitialTweetData(tweetTree)
        })
    }

    setInitialTweetData(tree: TweetTree) {
        this.tweetTree = tree
        this.vis.setTreeData(tree)
        this.vis.zoomToFit()
    }

    private expandNode(node: TweetNode) {
        this.server
            .requestTweets(node.tweet.id, node.cursor)
            .then((tweetSet) => {
                this.tweetTree.addTweets(tweetSet)
                this.vis.setTreeData(this.tweetTree)
                if (node === this.tweetTree.root) {
                    this.vis.zoomToFit()
                }
            })
    }

    shareClicked() {
        let value = SerializedTweetNode.fromTweetNode(this.tweetTree.root)
        let form = d3.select(this.toolbar.container)
            .append('form')
            .attr('method', 'post')
            .attr('action', 'https://1l8hy2eaaj.execute-api.us-east-1.amazonaws.com/default/treeverse_post')
        form.append('input')
            .attr('type', 'hidden')
            .attr('name', 'content')
            .attr('value', JSON.stringify(value));
        (form.node() as any).submit()
    }

    constructor(server: TweetServer, offline = false) {
        this.server = server
        this.feed = new FeedController(document.getElementById('feedContainer'))
        this.vis = new TweetVisualization(document.getElementById('tree'))

        this.toolbar = new Toolbar(document.getElementById('toolbar'))
        if (!offline) {
            this.toolbar.addButton('Create shareable link', this.shareClicked.bind(this))
        }

        this.vis.on('hover', this.feed.setFeed.bind(this.feed))
        if (!offline) {
            this.vis.on('dblclick', this.expandNode.bind(this))
        }
    }
}
