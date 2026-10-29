module BlogRelatedPosts
  def self.rank(current, posts, limit = 3)
    tags = Array(current.data['tags'])
    posts.filter_map do |candidate|
      next if candidate.url == current.url

      shared = (tags & Array(candidate.data['tags'])).length
      same_topic = current.data['topic'] && current.data['topic'] == candidate.data['topic']
      score = shared * 3 + (same_topic ? 2 : 0)
      next if score.zero?

      [candidate, score, shared]
    end.sort_by { |candidate, score, shared| [-score, -shared, -candidate.date.to_i, candidate.url] }
       .first(limit).map(&:first)
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  posts = site.posts.docs
  posts.each { |post| post.data['related_posts'] = BlogRelatedPosts.rank(post, posts) }
end
