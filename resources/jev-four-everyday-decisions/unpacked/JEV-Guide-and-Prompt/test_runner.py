import copy,json,pathlib,unittest
from run_jev import decision_result
class ReviewTests(unittest.TestCase):
 def setUp(self):
  self.e=json.loads((pathlib.Path(__file__).parent/'examples/support-queue.json').read_text())
  self.r={'model':'jev-1.13.0','answers':{'decision':{'type':'choice','choice':'billing','confidence':.95,'probabilities':{'billing':.97,'technical':.01,'sales':.01,'review':.01}}}}
 def test_valid(self):self.assertEqual(decision_result(self.e,self.r)['status'],'suggestion')
 def test_low(self):self.r['answers']['decision']['confidence']=.3;self.assertEqual(decision_result(self.e,self.r)['reason'],'low_confidence')
 def test_missing(self):self.assertEqual(decision_result(self.e,{})['status'],'review')
 def test_unknown(self):self.r['answers']['decision'].update(choice='review',probabilities={'billing':.01,'technical':.01,'sales':.01,'review':.97});self.assertEqual(decision_result(self.e,self.r)['reason'],'unknown')
 def test_invalid_label(self):self.r['answers']['decision']['choice']='invented';self.assertEqual(decision_result(self.e,self.r)['reason'],'invalid_response')
 def test_nan(self):self.r['answers']['decision']['confidence']=float('nan');self.assertEqual(decision_result(self.e,self.r)['status'],'review')
 def test_probability(self):self.r['answers']['decision']['probabilities']['billing']=2;self.assertEqual(decision_result(self.e,self.r)['status'],'review')
 def test_always_review(self):self.e['always_review']=True;self.assertEqual(decision_result(self.e,self.r)['reason'],'human_review_required')
if __name__=='__main__':unittest.main()
