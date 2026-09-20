import PostServiceReview from '@/components/reservation/PostServiceReview';
export default function LaisserAvisModal({reservation,onClose,onSuccess}){
 return <PostServiceReview reservation={reservation} onClose={onClose} onSubmitted={onSuccess}/>;
}
